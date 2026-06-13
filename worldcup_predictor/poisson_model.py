from __future__ import annotations

from dataclasses import dataclass
from math import exp, factorial

import numpy as np
import pandas as pd

from worldcup_predictor import config


@dataclass(frozen=True)
class ScorelineSummary:
    expected_goals_team_a: float
    expected_goals_team_b: float
    poisson_team_a_win_probability: float
    poisson_draw_probability: float
    poisson_team_b_win_probability: float
    over_1_5_probability: float
    over_2_5_probability: float
    over_3_5_probability: float
    both_teams_to_score_probability: float
    most_likely_scoreline: str
    top_5_scorelines: list[dict[str, float | str]]
    score_matrix: np.ndarray


def predict_poisson_summary(row: pd.Series, max_goals: int = config.SCORE_MATRIX_MAX_GOALS) -> ScorelineSummary:
    expected_a, expected_b = expected_goals(row)
    matrix = score_probability_matrix(expected_a, expected_b, max_goals=max_goals)
    return summarize_score_matrix(expected_a, expected_b, matrix)


def expected_goals(row: pd.Series) -> tuple[float, float]:
    base_goal_rate = _number(row.get("base_goal_rate"), config.BASE_GOAL_RATE)
    attack_a = _number(row.get("team_a_attack_strength"), 1.0)
    attack_b = _number(row.get("team_b_attack_strength"), 1.0)
    defense_a = _number(row.get("team_a_defensive_strength"), 1.0)
    defense_b = _number(row.get("team_b_defensive_strength"), 1.0)
    rating_difference = _number(row.get("rating_difference"), 0.0)

    # Defensive strength is goals or xG conceded divided by the dataset average.
    # Values below 1.0 represent a better defense and reduce opponent expected goals.
    rating_a = float(np.clip(np.exp(rating_difference / 1200.0), 0.70, 1.35))
    rating_b = float(np.clip(np.exp(-rating_difference / 1200.0), 0.70, 1.35))
    context_a, context_b = _context_adjustments(row)

    expected_a = base_goal_rate * attack_a * defense_b * rating_a * context_a
    expected_b = base_goal_rate * attack_b * defense_a * rating_b * context_b
    return _clamp(expected_a), _clamp(expected_b)


def score_probability_matrix(
    expected_goals_team_a: float,
    expected_goals_team_b: float,
    max_goals: int = config.SCORE_MATRIX_MAX_GOALS,
) -> np.ndarray:
    lambda_a = _clamp(expected_goals_team_a)
    lambda_b = _clamp(expected_goals_team_b)
    goals = range(max_goals + 1)
    probabilities_a = np.array([_poisson_probability(goal, lambda_a) for goal in goals])
    probabilities_b = np.array([_poisson_probability(goal, lambda_b) for goal in goals])
    matrix = np.outer(probabilities_a, probabilities_b)
    total = float(matrix.sum())
    if total <= 0:
        raise ValueError("Poisson score matrix has no probability mass.")
    return matrix / total


def summarize_score_matrix(
    expected_goals_team_a: float,
    expected_goals_team_b: float,
    matrix: np.ndarray,
    top_n: int = 5,
) -> ScorelineSummary:
    team_a_win = float(np.tril(matrix, -1).sum())
    draw = float(np.trace(matrix))
    team_b_win = float(np.triu(matrix, 1).sum())
    over_1_5 = 0.0
    over_2_5 = 0.0
    over_3_5 = 0.0
    both_teams_to_score = 0.0
    scorelines: list[dict[str, float | str]] = []

    # The matrix cell [i, j] is P(team A scores i and team B scores j).
    # All scoreline, total-goals, BTTS, and 1X2 probabilities are summed from it.
    for goals_a in range(matrix.shape[0]):
        for goals_b in range(matrix.shape[1]):
            probability = float(matrix[goals_a, goals_b])
            total_goals = goals_a + goals_b
            scorelines.append({"score": f"{goals_a}-{goals_b}", "probability": probability})
            over_1_5 += probability if total_goals > 1.5 else 0.0
            over_2_5 += probability if total_goals > 2.5 else 0.0
            over_3_5 += probability if total_goals > 3.5 else 0.0
            both_teams_to_score += probability if goals_a > 0 and goals_b > 0 else 0.0

    top_scorelines = sorted(scorelines, key=lambda item: float(item["probability"]), reverse=True)[:top_n]
    total = team_a_win + draw + team_b_win
    return ScorelineSummary(
        expected_goals_team_a=_clamp(expected_goals_team_a),
        expected_goals_team_b=_clamp(expected_goals_team_b),
        poisson_team_a_win_probability=team_a_win / total,
        poisson_draw_probability=draw / total,
        poisson_team_b_win_probability=team_b_win / total,
        over_1_5_probability=float(over_1_5),
        over_2_5_probability=float(over_2_5),
        over_3_5_probability=float(over_3_5),
        both_teams_to_score_probability=float(both_teams_to_score),
        most_likely_scoreline=str(top_scorelines[0]["score"]),
        top_5_scorelines=top_scorelines,
        score_matrix=matrix,
    )


def recommended_scoreline_for_outcome(summary: ScorelineSummary, outcome: str) -> str:
    matrix = summary.score_matrix
    best_score = summary.most_likely_scoreline
    best_probability = -1.0
    for goals_a in range(matrix.shape[0]):
        for goals_b in range(matrix.shape[1]):
            if outcome == "team_a_win" and goals_a <= goals_b:
                continue
            if outcome == "draw" and goals_a != goals_b:
                continue
            if outcome == "team_b_win" and goals_b <= goals_a:
                continue
            probability = float(matrix[goals_a, goals_b])
            if probability > best_probability:
                best_probability = probability
                best_score = f"{goals_a}-{goals_b}"
    return best_score


def _context_adjustments(row: pd.Series) -> tuple[float, float]:
    host_advantage = _number(row.get("host_advantage"), 0.0)
    neutral = _number(row.get("neutral_venue"), 1.0)
    rest_difference = _number(row.get("rest_days_difference"), 0.0)
    importance = _number(row.get("match_importance"), 0.5)

    home_factor = 0.0 if neutral >= 1.0 else 0.05
    host_factor_a = 0.06 if host_advantage > 0 else -0.03 if host_advantage < 0 else home_factor
    host_factor_b = 0.06 if host_advantage < 0 else -0.03 if host_advantage > 0 else 0.0
    rest_factor_a = float(np.clip(rest_difference * 0.012, -0.06, 0.06))
    rest_factor_b = -rest_factor_a
    importance_drag = -0.04 if importance >= 0.8 else 0.0

    return (
        float(np.clip(1.0 + host_factor_a + rest_factor_a + importance_drag, 0.75, 1.25)),
        float(np.clip(1.0 + host_factor_b + rest_factor_b + importance_drag, 0.75, 1.25)),
    )


def _number(value: object, default: float) -> float:
    numeric = pd.to_numeric(pd.Series([value]), errors="coerce").iloc[0]
    if pd.isna(numeric) or not np.isfinite(float(numeric)):
        return float(default)
    return float(numeric)


def _clamp(value: float) -> float:
    if not np.isfinite(value):
        value = config.BASE_GOAL_RATE
    return float(np.clip(value, config.EXPECTED_GOALS_MIN, config.EXPECTED_GOALS_MAX))


def _poisson_probability(goals: int, expected: float) -> float:
    return float(exp(-expected) * expected**goals / factorial(goals))
