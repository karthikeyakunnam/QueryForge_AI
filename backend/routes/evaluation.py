from fastapi import APIRouter, HTTPException

from services.evaluation_store import evaluation_store

router = APIRouter()


@router.get("/evaluation/runs")
async def list_evaluation_runs():
    return {"runs": [run.model_dump() for run in evaluation_store.list_runs()]}


@router.get("/evaluation/runs/{run_id}")
async def get_evaluation_run(run_id: str):
    run = evaluation_store.load_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Evaluation run not found.")
    return run.model_dump()
