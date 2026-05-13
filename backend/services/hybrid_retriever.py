import math
import re
import time
from collections import Counter
from typing import Dict, List, Optional

try:
    from rank_bm25 import BM25Okapi
except ImportError:  # pragma: no cover - dependency is declared, fallback keeps local dev usable.
    BM25Okapi = None

from config import DENSE_WEIGHT, KEYWORD_WEIGHT, MIN_RETRIEVAL_CONFIDENCE, RERANK_WEIGHT
from models.document import QueryProfile, RetrievalDiagnostics, SourceCitation
from services.cache import retrieval_cache, stable_cache_key
from services.cost_optimizer import trim_sources_to_budget
from services.document_store import document_store
from services.prompt_security import inspect_retrieved_text
from services.vector_store import dense_search_async


def tokenize(text: str) -> List[str]:
    return re.findall(r"[a-zA-Z0-9_.$%-]+", text.lower())


def _chunk_key(chunk: dict) -> str:
    metadata = chunk.get("metadata", chunk)
    return f"{metadata.get('document_id')}:{metadata.get('chunk_id')}"


def _normalize_scores(items: List[dict], score_key: str) -> None:
    if not items:
        return
    values = [float(item.get(score_key, 0.0)) for item in items]
    min_value, max_value = min(values), max(values)
    for item in items:
        value = float(item.get(score_key, 0.0))
        if math.isclose(max_value, min_value):
            item[score_key] = 1.0 if value > 0 else 0.0
        else:
            item[score_key] = (value - min_value) / (max_value - min_value)


def keyword_search(query: str, top_k: int = 12, doc_id: Optional[str] = None, chunk_id: Optional[int] = None) -> List[dict]:
    chunks = document_store.load_chunks(document_id=doc_id)
    if chunk_id is not None:
        chunks = [chunk for chunk in chunks if chunk["chunk_id"] == chunk_id]
    if not chunks:
        return []

    query_tokens = tokenize(query)
    corpus = [tokenize(chunk["text"]) for chunk in chunks]
    if BM25Okapi:
        bm25 = BM25Okapi(corpus)
        scores = bm25.get_scores(query_tokens)
    else:
        query_counts = Counter(query_tokens)
        scores = []
        for tokens in corpus:
            counts = Counter(tokens)
            scores.append(sum(counts[token] * weight for token, weight in query_counts.items()))

    results = []
    for chunk, score in zip(chunks, scores):
        if score <= 0:
            continue
        results.append(
            {
                "id": _chunk_key(chunk),
                "text": chunk["text"],
                "keyword_score": float(score),
                "metadata": chunk,
            }
        )
    results.sort(key=lambda item: item["keyword_score"], reverse=True)
    results = results[:top_k]
    _normalize_scores(results, "keyword_score")
    return results


def extract_highlights(query: str, text: str, limit: int = 3) -> List[str]:
    terms = [term for term in tokenize(query) if len(term) > 2]
    sentences = re.split(r"(?<=[.!?])\s+", text)
    scored = []
    for sentence in sentences:
        lower = sentence.lower()
        score = sum(1 for term in terms if term in lower)
        if score:
            scored.append((score, sentence.strip()))
    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [sentence for _, sentence in scored[:limit]]


def rerank_score(query: str, text: str) -> float:
    query_terms = set(tokenize(query))
    text_terms = set(tokenize(text))
    if not query_terms or not text_terms:
        return 0.0
    overlap = len(query_terms & text_terms) / len(query_terms)
    length_penalty = min(1.0, 900 / max(len(text), 1))
    return max(0.0, min(1.0, (0.75 * overlap) + (0.25 * length_penalty)))


async def hybrid_retrieve(
    query: str,
    top_k: int = 5,
    doc_id: Optional[str] = None,
    chunk_id: Optional[int] = None,
    profile: Optional[QueryProfile] = None,
) -> tuple[List[SourceCitation], float, RetrievalDiagnostics]:
    started = time.perf_counter()
    profile_top_k = profile.top_k if profile else top_k
    effective_top_k = max(top_k, profile_top_k)
    cache_key = stable_cache_key(query, effective_top_k, doc_id, chunk_id, profile.query_type if profile else "default")
    cached = retrieval_cache.get(cache_key)
    if cached:
        sources, confidence, diagnostics = cached
        diagnostics.cache_hit = True
        return sources, confidence, diagnostics

    dense_results = await dense_search_async(
        query, top_k=max(effective_top_k * 3, 10), doc_id=doc_id, chunk_id=chunk_id
    )
    keyword_results = keyword_search(query, top_k=max(effective_top_k * 3, 10), doc_id=doc_id, chunk_id=chunk_id)

    merged: Dict[str, dict] = {}
    for result in dense_results:
        key = _chunk_key(result)
        merged.setdefault(key, {"text": result["text"], "metadata": result["metadata"]})
        merged[key]["dense_score"] = max(merged[key].get("dense_score", 0.0), result.get("score", 0.0))

    for result in keyword_results:
        key = _chunk_key(result)
        merged.setdefault(key, {"text": result["text"], "metadata": result["metadata"]})
        merged[key]["keyword_score"] = max(merged[key].get("keyword_score", 0.0), result.get("keyword_score", 0.0))

    ranked = []
    for item in merged.values():
        dense_score = float(item.get("dense_score", 0.0))
        keyword_score = float(item.get("keyword_score", 0.0))
        rerank = rerank_score(query, item["text"])
        dense_weight = profile.dense_weight if profile else DENSE_WEIGHT
        keyword_weight = profile.keyword_weight if profile else KEYWORD_WEIGHT
        rerank_weight = profile.rerank_weight if profile else RERANK_WEIGHT
        score = (dense_weight * dense_score) + (keyword_weight * keyword_score) + (rerank_weight * rerank)
        if score < MIN_RETRIEVAL_CONFIDENCE:
            continue
        item.update(
            {
                "score": max(0.0, min(1.0, score)),
                "dense_score": dense_score,
                "keyword_score": keyword_score,
                "rerank_score": rerank,
            }
        )
        ranked.append(item)

    ranked.sort(key=lambda item: item["score"], reverse=True)
    ranked = ranked[:effective_top_k]

    sources = []
    suspicious_sources = 0
    for index, item in enumerate(ranked, start=1):
        metadata = item["metadata"]
        parent_context = document_store.load_parent_context(
            metadata.get("document_id", ""), int(metadata.get("chunk_id", 0)), window=1
        )
        safety = inspect_retrieved_text(parent_context or item["text"])
        suspicious_sources += 1 if safety.suspicious_score > 0 else 0
        sources.append(
            SourceCitation(
                citation_id=f"S{index}",
                document_id=metadata.get("document_id", ""),
                file_name=metadata.get("file_name") or metadata.get("doc_id", ""),
                chunk_id=int(metadata.get("chunk_id", 0)),
                page_start=int(metadata.get("page_start", 1)),
                page_end=int(metadata.get("page_end", metadata.get("page_start", 1))),
                score=item["score"],
                dense_score=item["dense_score"],
                keyword_score=item["keyword_score"],
                rerank_score=item["rerank_score"],
                text=safety.sanitized_text,
                highlights=extract_highlights(query, item["text"]),
                metadata={
                    "content_hash": metadata.get("content_hash"),
                    "retrieval_strategy": "dense+bm25+rerank",
                    "parent_child": True,
                    "child_text": item["text"],
                    "suspicious_score": safety.suspicious_score,
                    "security_flags": safety.flags,
                },
            )
        )

    if profile:
        sources = trim_sources_to_budget(sources, profile.token_budget)

    confidence = sum(source.score for source in sources) / len(sources) if sources else 0.0
    diagnostics = RetrievalDiagnostics(
        strategy="hybrid_dense_bm25_rerank",
        dense_results=len(dense_results),
        keyword_results=len(keyword_results),
        returned_results=len(sources),
        latency_ms=round((time.perf_counter() - started) * 1000, 2),
        query_type=profile.query_type if profile else "factual",
        suspicious_sources=suspicious_sources,
        cache_hit=False,
        token_budget=profile.token_budget if profile else 0,
    )
    result = (sources, round(confidence, 4), diagnostics)
    retrieval_cache.set(cache_key, result)
    return result
