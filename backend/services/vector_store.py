import asyncio
from typing import Iterable, List, Optional

from pinecone import Pinecone, ServerlessSpec

from config import (
    PINECONE_API_KEY,
    PINECONE_CLOUD,
    PINECONE_ENV,
    PINECONE_INDEX_NAME,
    VECTOR_DB_DIMENSION,
)
from services.document_store import document_store
from services.embedding_service import get_embedding_model
from services.pdf_processor import DocumentChunk


def _require_pinecone_config() -> None:
    missing = [
        name
        for name, value in {
            "PINECONE_API_KEY": PINECONE_API_KEY,
            "PINECONE_INDEX_NAME": PINECONE_INDEX_NAME,
            "PINECONE_CLOUD": PINECONE_CLOUD,
            "PINECONE_REGION": PINECONE_ENV,
        }.items()
        if not value
    ]
    if missing:
        raise RuntimeError(f"Missing Pinecone configuration: {', '.join(missing)}")

_index = None


def get_index():
    global _index
    _require_pinecone_config()
    if _index is None:
        client = Pinecone(api_key=PINECONE_API_KEY)
        if PINECONE_INDEX_NAME not in client.list_indexes().names():
            client.create_index(
                name=PINECONE_INDEX_NAME,
                dimension=VECTOR_DB_DIMENSION,
                metric="cosine",
                spec=ServerlessSpec(cloud=PINECONE_CLOUD, region=PINECONE_ENV),
            )
        _index = client.Index(PINECONE_INDEX_NAME)
    return _index


def _vector_id(chunk: DocumentChunk | dict) -> str:
    document_id = chunk.document_id if isinstance(chunk, DocumentChunk) else chunk["document_id"]
    chunk_id = chunk.chunk_id if isinstance(chunk, DocumentChunk) else chunk["chunk_id"]
    return f"{document_id}:{chunk_id}"


def _metadata(chunk: DocumentChunk) -> dict:
    return {
        "text": chunk.text,
        "document_id": chunk.document_id,
        "doc_id": chunk.file_name,
        "file_name": chunk.file_name,
        "chunk_id": chunk.chunk_id,
        "page_start": chunk.page_start,
        "page_end": chunk.page_end,
        "content_hash": chunk.content_hash,
    }


def _batched(values: list, size: int) -> Iterable[list]:
    for start in range(0, len(values), size):
        yield values[start : start + size]


def store_vectors_in_pinecone(text_chunks, doc_id):
    """Compatibility wrapper for older route code."""
    chunks = [
        DocumentChunk(
            document_id=doc_id,
            file_name=doc_id,
            chunk_id=i,
            text=text,
            page_start=1,
            page_end=1,
            content_hash=str(abs(hash(text))),
        )
        for i, text in enumerate(text_chunks)
    ]
    return upsert_chunks(chunks)


def upsert_chunks(chunks: List[DocumentChunk]) -> bool:
    embed_model = get_embedding_model()
    vectors = []
    for chunk in chunks:
        vector = embed_model.get_text_embedding(chunk.text)
        if len(vector) != VECTOR_DB_DIMENSION:
            raise ValueError(
                f"Embedding dimension {len(vector)} does not match Pinecone index dimension {VECTOR_DB_DIMENSION}."
            )
        vectors.append({"id": _vector_id(chunk), "values": vector, "metadata": _metadata(chunk)})

    for batch in _batched(vectors, 100):
        get_index().upsert(vectors=batch)
    return True


async def upsert_chunks_async(chunks: List[DocumentChunk]) -> bool:
    return await asyncio.to_thread(upsert_chunks, chunks)


def _pinecone_filter(doc_id: Optional[str] = None, chunk_id: Optional[int] = None) -> Optional[dict]:
    filters = {}
    if doc_id:
        filters["$or"] = [{"document_id": {"$eq": doc_id}}, {"doc_id": {"$eq": doc_id}}]
    if chunk_id is not None:
        filters["chunk_id"] = {"$eq": chunk_id}
    return filters or None


def dense_search(query: str, top_k: int = 8, doc_id: Optional[str] = None, chunk_id: Optional[int] = None) -> List[dict]:
    embed_model = get_embedding_model()
    query_embedding = embed_model.get_text_embedding(query)
    result = get_index().query(
        vector=query_embedding,
        top_k=top_k,
        filter=_pinecone_filter(doc_id=doc_id, chunk_id=chunk_id),
        include_metadata=True,
    )
    matches = getattr(result, "matches", None) or result.get("matches", [])
    normalized = []
    for match in matches:
        metadata = dict(getattr(match, "metadata", None) or match.get("metadata", {}))
        score = float(getattr(match, "score", None) or match.get("score", 0.0))
        normalized.append(
            {
                "id": getattr(match, "id", None) or match.get("id"),
                "text": metadata.get("text", ""),
                "score": max(0.0, min(1.0, score)),
                "metadata": metadata,
            }
        )
    return normalized


async def dense_search_async(
    query: str, top_k: int = 8, doc_id: Optional[str] = None, chunk_id: Optional[int] = None
) -> List[dict]:
    return await asyncio.to_thread(dense_search, query, top_k, doc_id, chunk_id)


def search_vectors_in_pinecone(query, top_k=5, embed_model=None, doc_id=None, chunk_id=None):
    return [item["text"] for item in dense_search(query, top_k, doc_id, chunk_id)]


def list_documents_in_pinecone():
    return document_store.list_documents()
