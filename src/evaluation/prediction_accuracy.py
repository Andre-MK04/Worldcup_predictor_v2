from __future__ import annotations

from pathlib import Path

from src.data_sources.data_refresh import (
    read_csv,
    summarize_evaluation,
    update_evaluation_metrics,
)


MATCH_EVALUATION_PATH = Path("outputs/match_evaluation.csv")


def getEligibleEvaluatedMatches() -> list[dict[str, str]]:
    return [row for row in read_csv(MATCH_EVALUATION_PATH) if row.get("eligible_for_evaluation") == "true"]


def comparePredictionToResult(row: dict[str, str]) -> dict[str, bool]:
    return {
        "prediction_correct": row.get("predicted_result_label") == row.get("actual_result_label"),
        "exact_scoreline_correct": normalize_score(row.get("most_likely_single_scoreline", ""))
        == normalize_score(row.get("actual_scoreline") or row.get("actual_score", "")),
        "actual_score_in_top_5": row.get("actual_score_in_top_5") == "true",
    }


def calculateResultAccuracy(rows: list[dict[str, str]] | None = None) -> float | None:
    rows = rows if rows is not None else getEligibleEvaluatedMatches()
    if not rows:
        return None
    return sum(1 for row in rows if row.get("prediction_correct") == "true") / len(rows)


def calculateExactScorelineAccuracy(rows: list[dict[str, str]] | None = None) -> float | None:
    rows = rows if rows is not None else getEligibleEvaluatedMatches()
    if not rows:
        return None
    return sum(1 for row in rows if row.get("exact_scoreline_correct") == "true") / len(rows)


def calculateTop5ScorelineHitRate(rows: list[dict[str, str]] | None = None) -> float | None:
    rows = rows if rows is not None else getEligibleEvaluatedMatches()
    if not rows:
        return None
    return sum(1 for row in rows if row.get("actual_score_in_top_5") == "true") / len(rows)


def calculatePerformanceSummary(rows: list[dict[str, str]] | None = None) -> dict[str, object]:
    rows = rows if rows is not None else getEligibleEvaluatedMatches()
    all_rows = read_csv(MATCH_EVALUATION_PATH)
    not_eligible = len([row for row in all_rows if row.get("eligible_for_evaluation") != "true"])
    return summarize_evaluation(rows, not_eligible)


def exportMatchEvaluation() -> dict[str, object]:
    return update_evaluation_metrics()


def normalize_score(value: str) -> str:
    return value.replace("–", "-").replace(" ", "").strip()
