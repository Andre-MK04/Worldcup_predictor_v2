from __future__ import annotations

from fastapi import APIRouter

from backend.services.evaluation_service import load_evaluation
from src.evaluation.prediction_accuracy import exportMatchEvaluation

router = APIRouter()


@router.get("/performance/summary")
def get_performance_summary() -> dict[str, object]:
    return load_evaluation().get("summary", {})


@router.get("/performance/matches")
def get_performance_matches() -> list[dict[str, str]]:
    return load_evaluation().get("matches", [])


@router.get("/performance/correct-results")
def get_correct_results() -> list[dict[str, str]]:
    matches = load_evaluation().get("matches", [])
    return [match for match in matches if match.get("eligible_for_evaluation") == "true" and match.get("prediction_correct") == "true"]


@router.get("/performance/correct-scorelines")
def get_correct_scorelines() -> list[dict[str, str]]:
    matches = load_evaluation().get("matches", [])
    return [
        match
        for match in matches
        if match.get("eligible_for_evaluation") == "true" and match.get("exact_scoreline_correct") == "true"
    ]


@router.post("/performance/recalculate")
def recalculate_performance() -> dict[str, object]:
    exportMatchEvaluation()
    return load_evaluation()
