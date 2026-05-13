import json
from datetime import datetime, timezone
from pathlib import Path
from statistics import quantiles
from uuid import uuid4

from models.document import EvaluationRun, EvaluationSummary


class EvaluationStore:
    def __init__(self, root: str = "backend/reports"):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def _run_path(self, run_id: str) -> Path:
        return self.root / f"{run_id}.json"

    def save_run(self, results: list[dict], benchmark_name: str, strategy: str) -> EvaluationRun:
        run_id = f"eval-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid4().hex[:8]}"
        latencies = [float(item.get("latency_ms") or 0.0) for item in results]
        p95_latency = quantiles(latencies, n=20)[-1] if len(latencies) >= 2 else (latencies[0] if latencies else 0.0)
        summary = EvaluationSummary(
            run_id=run_id,
            created_at=datetime.now(timezone.utc).isoformat(),
            benchmark_name=benchmark_name,
            strategy=strategy,
            cases=len(results),
            mean_confidence=_mean(results, "confidence"),
            mean_faithfulness=_mean(results, "faithfulness_score"),
            mean_retrieval_relevancy=_mean(results, "retrieval_relevancy_score"),
            hallucination_rate=_mean(results, "hallucination", truthy=True),
            expected_chunk_recall=_mean(results, "expected_chunk_retrieved", truthy=True),
            p95_latency_ms=round(p95_latency, 2),
        )
        run = EvaluationRun(summary=summary, results=results)
        self._run_path(run_id).write_text(run.model_dump_json(indent=2), encoding="utf-8")
        return run

    def list_runs(self) -> list[EvaluationSummary]:
        runs = []
        for path in sorted(self.root.glob("eval-*.json")):
            data = json.loads(path.read_text(encoding="utf-8"))
            runs.append(EvaluationSummary(**data["summary"]))
        return sorted(runs, key=lambda item: item.created_at)

    def load_run(self, run_id: str) -> EvaluationRun | None:
        path = self._run_path(run_id)
        if not path.exists():
            return None
        return EvaluationRun(**json.loads(path.read_text(encoding="utf-8")))


def _mean(results: list[dict], key: str, truthy: bool = False) -> float:
    if not results:
        return 0.0
    if truthy:
        values = [1.0 if item.get(key) else 0.0 for item in results]
    else:
        values = [float(item.get(key) or 0.0) for item in results]
    return round(sum(values) / len(values), 4)


evaluation_store = EvaluationStore()
