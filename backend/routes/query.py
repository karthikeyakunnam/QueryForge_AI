import json
from typing import AsyncIterator

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from models.document import QueryRequest, QueryResponse
from services.hybrid_retriever import hybrid_retrieve
from services.llm_service import (
    build_grounded_prompt,
    complete_openai_answer,
    remove_hallucinated_citations,
    stream_openai_answer,
)
from services.prompt_security import sanitize_query
from services.query_classifier import classify_query

router = APIRouter()


def _sse(event: str, data: dict | str) -> str:
    payload = data if isinstance(data, str) else json.dumps(data)
    return f"event: {event}\ndata: {payload}\n\n"


@router.post("/query", response_model=QueryResponse)
async def query_chatbot(query_data: QueryRequest):
    try:
        safe_query = sanitize_query(query_data.query)
        profile = classify_query(safe_query, query_data.messages)
        sources, confidence, diagnostics = await hybrid_retrieve(
            query=safe_query,
            top_k=query_data.top_k,
            doc_id=query_data.doc_id,
            chunk_id=query_data.chunk_id,
            profile=profile,
        )
        if not sources:
            return QueryResponse(
                query=safe_query,
                response="I do not have enough evidence in the uploaded document to answer that.",
                retrieved_chunks=[],
                sources=[],
                confidence=0.0,
                diagnostics=diagnostics,
            )

        prompt = build_grounded_prompt(safe_query, sources, query_data.messages)
        answer = await complete_openai_answer(prompt)
        valid_ids = {source.citation_id for source in sources}
        answer = remove_hallucinated_citations(answer, valid_ids).strip()
        return QueryResponse(
            query=safe_query,
            response=answer,
            retrieved_chunks=[source.text for source in sources],
            sources=sources,
            confidence=confidence,
            diagnostics=diagnostics,
            metadata={
                "citation_policy": "validated_source_ids_only",
                "query_profile": profile.model_dump(),
            },
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Query processing failed: {exc}") from exc


@router.post("/query/stream")
async def stream_query_chatbot(query_data: QueryRequest, request: Request):
    async def event_stream() -> AsyncIterator[str]:
        answer_parts: list[str] = []
        try:
            safe_query = sanitize_query(query_data.query)
            profile = classify_query(safe_query, query_data.messages)
            yield _sse("status", {"stage": "retrieving"})
            sources, confidence, diagnostics = await hybrid_retrieve(
                query=safe_query,
                top_k=query_data.top_k,
                doc_id=query_data.doc_id,
                chunk_id=query_data.chunk_id,
                profile=profile,
            )
            yield _sse(
                "sources",
                {
                    "sources": [source.model_dump() for source in sources],
                    "confidence": confidence,
                    "diagnostics": diagnostics.model_dump(),
                    "query_profile": profile.model_dump(),
                },
            )

            if not sources:
                message = "I do not have enough evidence in the uploaded document to answer that."
                yield _sse("token", {"token": message})
                yield _sse("done", {"response": message, "confidence": 0.0, "sources": []})
                return

            yield _sse("status", {"stage": "generating"})
            prompt = build_grounded_prompt(safe_query, sources, query_data.messages)
            valid_ids = {source.citation_id for source in sources}

            async for token in stream_openai_answer(prompt):
                if await request.is_disconnected():
                    yield _sse("cancelled", {"reason": "client_disconnected"})
                    return
                answer_parts.append(token)
                yield _sse("token", {"token": token})

            answer = remove_hallucinated_citations("".join(answer_parts), valid_ids).strip()
            yield _sse(
                "done",
                {
                    "response": answer,
                    "confidence": confidence,
                    "sources": [source.model_dump() for source in sources],
                    "diagnostics": diagnostics.model_dump(),
                    "query_profile": profile.model_dump(),
                },
            )
        except Exception as exc:
            yield _sse("error", {"message": str(exc)})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
