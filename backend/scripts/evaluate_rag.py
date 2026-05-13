import argparse
import asyncio
import csv
import json
from pathlib import Path
from statistics import mean
from typing import Any, Dict, List

from llama_index.core.evaluation import FaithfulnessEvaluator, RelevancyEvaluator
from llama_index.llms.openai import OpenAI

from config import OPENAI_API_KEY, OPENAI_MODEL
from models.document import QueryRequest
from routes.query import query_chatbot
from services.document_store import document_store
from services.evaluation_store import evaluation_store


def synthetic_queries(chunks: List[dict], limit: int = 20) -> List[dict]:
    queries = []
    for chunk in chunks[:limit]:
        text = chunk["text"]
        first_sentence = text.split(".")[0][:240]
        if len(first_sentence) < 40:
            continue
        queries.append(
            {
                "query": f"What does the document say about: {first_sentence}?",
                "expected_document_id": chunk["document_id"],
                "expected_chunk_id": chunk["chunk_id"],
            }
        )
    return queries


async def evaluate_case(case: dict, faithfulness: FaithfulnessEvaluator, relevancy: RelevancyEvaluator) -> Dict[str, Any]:
    response = await query_chatbot(
        QueryRequest(query=case["query"], doc_id=case.get("expected_document_id"), top_k=5)
    )
    contexts = [source.text for source in response.sources]
    faithfulness_result = await faithfulness.aevaluate(
        query=case["query"],
        response=response.response,
        contexts=contexts,
    )
    relevancy_result = await relevancy.aevaluate(
        query=case["query"],
        response=response.response,
        contexts=contexts,
    )
    expected_chunk_id = case.get("expected_chunk_id")
    retrieved_chunk_ids = [source.chunk_id for source in response.sources]
    return {
        "query": case["query"],
        "confidence": response.confidence,
        "faithfulness_score": float(faithfulness_result.score or 0.0),
        "retrieval_relevancy_score": float(relevancy_result.score or 0.0),
        "grounded": bool(faithfulness_result.passing),
        "hallucination": not bool(faithfulness_result.passing),
        "expected_chunk_retrieved": expected_chunk_id in retrieved_chunk_ids,
        "retrieved_chunks": retrieved_chunk_ids,
        "latency_ms": response.diagnostics.latency_ms if response.diagnostics else None,
        "answer": response.response,
    }


async def main() -> None:
    parser = argparse.ArgumentParser(description="Run automated RAG evaluation.")
    parser.add_argument("--queries", help="Path to JSONL benchmark queries.")
    parser.add_argument("--document-id", help="Generate synthetic queries from a specific document.")
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--out", default="backend/reports/rag_eval_report.json")
    args = parser.parse_args()

    if args.queries:
        cases = [json.loads(line) for line in Path(args.queries).read_text().splitlines() if line.strip()]
    else:
        cases = synthetic_queries(document_store.load_chunks(args.document_id), args.limit)

    llm = OpenAI(model=OPENAI_MODEL or "gpt-4o-mini", api_key=OPENAI_API_KEY)
    faithfulness = FaithfulnessEvaluator(llm=llm)
    relevancy = RelevancyEvaluator(llm=llm)
    results = [await evaluate_case(case, faithfulness, relevancy) for case in cases]

    summary = {
        "cases": len(results),
        "mean_confidence": mean([item["confidence"] for item in results]) if results else 0.0,
        "mean_faithfulness": mean([item["faithfulness_score"] for item in results]) if results else 0.0,
        "mean_retrieval_relevancy": mean([item["retrieval_relevancy_score"] for item in results]) if results else 0.0,
        "hallucination_rate": mean([1.0 if item["hallucination"] else 0.0 for item in results]) if results else 0.0,
        "expected_chunk_recall": mean([1.0 if item["expected_chunk_retrieved"] else 0.0 for item in results])
        if results
        else 0.0,
    }
    report = {"summary": summary, "results": results}
    run = evaluation_store.save_run(results, benchmark_name=args.queries or "synthetic", strategy="hybrid_dense_bm25_rerank")
    report["tracked_run"] = run.summary.model_dump()

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    csv_path = out_path.with_suffix(".csv")
    if results:
        with csv_path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=list(results[0].keys()))
            writer.writeheader()
            writer.writerows(results)

    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
