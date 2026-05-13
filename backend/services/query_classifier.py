import re

from models.document import ChatMessage, QueryProfile


def classify_query(query: str, messages: list[ChatMessage] | None = None) -> QueryProfile:
    text = query.lower().strip()
    messages = messages or []

    if messages and re.search(r"\b(it|that|they|those|this|previous|above|same)\b", text):
        return QueryProfile(
            query_type="follow_up",
            top_k=8,
            dense_weight=0.50,
            keyword_weight=0.25,
            rerank_weight=0.25,
            token_budget=4200,
            reasoning="Pronoun/reference language plus conversation history indicates a follow-up query.",
        )

    if re.search(r"\b(summarize|summary|overview|main points|key takeaways|tl;dr)\b", text):
        return QueryProfile(
            query_type="summarization",
            top_k=12,
            dense_weight=0.45,
            keyword_weight=0.20,
            rerank_weight=0.35,
            token_budget=5200,
            reasoning="Summary intent benefits from broader parent context and more diverse chunks.",
        )

    if re.search(r"\b(cite|citation|quote|evidence|sources?|page|reference|where does it say)\b", text):
        return QueryProfile(
            query_type="citation_heavy",
            top_k=7,
            dense_weight=0.45,
            keyword_weight=0.35,
            rerank_weight=0.20,
            token_budget=3600,
            reasoning="Citation-heavy query needs exact wording and stronger keyword weighting.",
        )

    if re.search(r"\b(compare|all|across|throughout|themes|every|relationship|differences)\b", text):
        return QueryProfile(
            query_type="broad_search",
            top_k=10,
            dense_weight=0.50,
            keyword_weight=0.25,
            rerank_weight=0.25,
            token_budget=4800,
            reasoning="Broad query needs wider recall before reranking.",
        )

    return QueryProfile(
        query_type="factual",
        top_k=5,
        dense_weight=0.60,
        keyword_weight=0.25,
        rerank_weight=0.15,
        token_budget=3200,
        reasoning="Default factual question prioritizes precise semantic retrieval.",
    )
