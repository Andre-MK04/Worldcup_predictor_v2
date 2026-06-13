from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from worldcup_predictor import config
from worldcup_predictor.poisson_model import (
    ScorelineSummary,
    predict_poisson_summary,
)
from worldcup_predictor.xgboost_model import TrainedOutcomeModel, predict_outcome_probabilities


@dataclass
class HybridPredictor:
    outcome_model: TrainedOutcomeModel
    xgboost_weight: float = config.XGBOOST_WEIGHT
    poisson_weight: float = config.POISSON_WEIGHT

    def predict_matches(self, feature_frame: pd.DataFrame) -> list[dict[str, object]]:
        xgb_probabilities = predict_outcome_probabilities(self.outcome_model, feature_frame)
        predictions = []
        for row_index, (_, row) in enumerate(feature_frame.reset_index(drop=True).iterrows()):
            poisson = predict_poisson_summary(row)
            predictions.append(
                build_prediction_object(
                    row,
                    xgb_probabilities[row_index],
                    poisson,
                    self.xgboost_weight,
                    self.poisson_weight,
                )
            )
        return predictions


def build_prediction_object(
    row: pd.Series,
    xgboost_probabilities: np.ndarray,
    poisson: ScorelineSummary,
    xgboost_weight: float = config.XGBOOST_WEIGHT,
    poisson_weight: float = config.POISSON_WEIGHT,
) -> dict[str, object]:
    team_a = str(row["team_a"])
    team_b = str(row["team_b"])
    poisson_probabilities = np.array(
        [
            poisson.poisson_team_a_win_probability,
            poisson.poisson_draw_probability,
            poisson.poisson_team_b_win_probability,
        ],
        dtype=float,
    )
    final_probabilities = blend_probabilities(
        xgboost_probabilities,
        poisson_probabilities,
        xgboost_weight,
        poisson_weight,
    )
    overall_outcome = config.CLASS_TO_RESULT[int(np.argmax(final_probabilities))]
    recommended_scoreline = _best_scoreline_for_outcome(poisson, overall_outcome)
    outcome = _outcome_from_scoreline(recommended_scoreline)

    return {
        "match": f"{team_a} vs {team_b}",
        "teams": {"team_a": team_a, "team_b": team_b},
        "date": str(pd.to_datetime(row["date"]).date()) if "date" in row else None,
        "expected_goals": {
            team_a: round(poisson.expected_goals_team_a, 3),
            team_b: round(poisson.expected_goals_team_b, 3),
        },
        "xgboost_probabilities": _probability_dict(team_a, team_b, xgboost_probabilities),
        "poisson_probabilities": _probability_dict(team_a, team_b, poisson_probabilities),
        "final_probabilities": _probability_dict(team_a, team_b, final_probabilities),
        "final_probability_array": [float(value) for value in final_probabilities],
        "goal_probabilities": {
            "over_1_5": round(poisson.over_1_5_probability, 4),
            "over_2_5": round(poisson.over_2_5_probability, 4),
            "over_3_5": round(poisson.over_3_5_probability, 4),
            "under_2_5": round(1.0 - poisson.over_2_5_probability, 4),
            "both_teams_to_score": round(poisson.both_teams_to_score_probability, 4),
        },
        "final_prediction": outcome,
        "overall_prediction": overall_outcome,
        "recommended_winner": _winner_label(outcome, team_a, team_b),
        "overall_predicted_winner": _winner_label(overall_outcome, team_a, team_b),
        "recommended_score": f"{team_a} {recommended_scoreline} {team_b}",
        "recommended_scoreline": recommended_scoreline,
        "true_most_likely_scoreline": poisson.most_likely_scoreline,
        "scoreline_consistency_note": _scoreline_consistency_note(outcome, overall_outcome, recommended_scoreline),
        "top_scorelines": [
            {"score": item["score"], "probability": round(float(item["probability"]), 4)}
            for item in poisson.top_5_scorelines
        ],
        "blend_weights": {
            "xgboost": float(xgboost_weight),
            "poisson": float(poisson_weight),
        },
        "explanation": explain_prediction(row, final_probabilities, poisson),
    }


def blend_probabilities(
    xgboost_probabilities: np.ndarray,
    poisson_probabilities: np.ndarray,
    xgboost_weight: float,
    poisson_weight: float,
) -> np.ndarray:
    total_weight = xgboost_weight + poisson_weight
    if total_weight <= 0:
        raise ValueError("Blend weights must have positive total weight.")
    blended = (xgboost_weight * xgboost_probabilities + poisson_weight * poisson_probabilities) / total_weight
    blended = np.clip(blended, 1e-6, 1.0)
    return blended / blended.sum()


def explain_prediction(row: pd.Series, final_probabilities: np.ndarray, poisson: ScorelineSummary) -> str:
    team_a = str(row["team_a"])
    team_b = str(row["team_b"])
    factors: list[str] = []
    rating_difference = _number(row.get("rating_difference"), 0.0)
    goals_a = _number(row.get("team_a_goals_scored_last_10"), config.BASE_GOAL_RATE)
    goals_b = _number(row.get("team_b_goals_scored_last_10"), config.BASE_GOAL_RATE)
    conceded_a = _number(row.get("team_a_goals_conceded_last_10"), config.BASE_GOAL_RATE)
    conceded_b = _number(row.get("team_b_goals_conceded_last_10"), config.BASE_GOAL_RATE)
    xg_a = _number(row.get("team_a_xg_last_10"), goals_a)
    xg_b = _number(row.get("team_b_xg_last_10"), goals_b)
    draw_probability = final_probabilities[1]

    if abs(rating_difference) >= 60:
        leader = team_a if rating_difference > 0 else team_b
        factors.append(f"{leader} has the clearer rating edge")
    if abs(goals_a - goals_b) >= 0.25:
        leader = team_a if goals_a > goals_b else team_b
        factors.append(f"{leader} has the stronger recent scoring rate")
    if abs(xg_a - xg_b) >= 0.25:
        leader = team_a if xg_a > xg_b else team_b
        factors.append(f"{leader} has the better recent xG trend")
    if abs(conceded_a - conceded_b) >= 0.25:
        leader = team_a if conceded_a < conceded_b else team_b
        factors.append(f"{leader} has allowed fewer goals recently")

    total_goals = poisson.expected_goals_team_a + poisson.expected_goals_team_b
    if draw_probability >= 0.28:
        factors.append("the draw risk is still meaningful because the expected goal gap is modest")
    if total_goals >= 2.8:
        factors.append("the goal model leans toward a higher-total match")
    elif total_goals <= 2.1:
        factors.append("the goal model expects a relatively low-total match")

    if not factors:
        factors.append("the available inputs describe a fairly balanced match")
    return "; ".join(factors) + "."


def _probability_dict(team_a: str, team_b: str, probabilities: np.ndarray) -> dict[str, float]:
    safe_a = team_a.replace(" ", "_")
    safe_b = team_b.replace(" ", "_")
    return {
        f"{safe_a}_win": round(float(probabilities[0]), 4),
        "draw": round(float(probabilities[1]), 4),
        f"{safe_b}_win": round(float(probabilities[2]), 4),
    }


def _winner_label(outcome: str, team_a: str, team_b: str) -> str:
    if outcome == "team_a_win":
        return team_a
    if outcome == "team_b_win":
        return team_b
    return "Draw"


def _outcome_from_scoreline(scoreline: str) -> str:
    goals_a_text, goals_b_text = scoreline.replace("–", "-").split("-", maxsplit=1)
    goals_a = int(goals_a_text)
    goals_b = int(goals_b_text)
    if goals_a > goals_b:
        return "team_a_win"
    if goals_b > goals_a:
        return "team_b_win"
    return "draw"


def _scoreline_consistency_note(scoreline_outcome: str, overall_outcome: str, scoreline: str) -> str | None:
    if scoreline_outcome == overall_outcome:
        return (
            f"Headline scoreline {scoreline} is selected as the most likely scoreline inside the "
            "highest-probability 1X2 outcome bucket. Raw exact-score rankings are shown separately."
        )
    return (
        f"Most likely exact scoreline is {scoreline}, so the headline outcome follows that scoreline. "
        "The overall_prediction field reports the highest summed 1X2 probability separately."
    )


def _best_scoreline_for_outcome(poisson: ScorelineSummary, outcome: str) -> str:
    best_scoreline = poisson.most_likely_scoreline
    best_probability = -1.0
    for goals_a in range(poisson.score_matrix.shape[0]):
        for goals_b in range(poisson.score_matrix.shape[1]):
            if _outcome_from_goals(goals_a, goals_b) != outcome:
                continue
            probability = float(poisson.score_matrix[goals_a, goals_b])
            if probability > best_probability:
                best_probability = probability
                best_scoreline = f"{goals_a}-{goals_b}"
    return best_scoreline


def _outcome_from_goals(goals_a: int, goals_b: int) -> str:
    if goals_a > goals_b:
        return "team_a_win"
    if goals_b > goals_a:
        return "team_b_win"
    return "draw"


def _number(value: object, default: float) -> float:
    numeric = pd.to_numeric(pd.Series([value]), errors="coerce").iloc[0]
    if pd.isna(numeric):
        return float(default)
    return float(numeric)
