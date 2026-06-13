from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import log_loss

from worldcup_predictor import config
from worldcup_predictor.data_loading import normalize_match_columns
from worldcup_predictor.feature_engineering import create_prediction_features, create_training_features
from worldcup_predictor.hybrid_predictor import HybridPredictor
from worldcup_predictor.xgboost_model import train_outcome_model


CONFIDENCE_BUCKETS = [
    (0.40, 0.50),
    (0.50, 0.60),
    (0.60, 0.70),
    (0.70, 0.80),
    (0.80, 0.90),
    (0.90, 1.01),
]


def backtest_time_based(
    matches: pd.DataFrame,
    test_size: float = config.TEST_SIZE,
    xgboost_weight: float = config.XGBOOST_WEIGHT,
    poisson_weight: float = config.POISSON_WEIGHT,
) -> tuple[dict[str, object], pd.DataFrame]:
    data = normalize_match_columns(matches).dropna(subset=["result"]).sort_values("date").reset_index(drop=True)
    if len(data) < 20:
        raise ValueError("Need at least 20 completed matches for time-based backtesting.")
    split_index = max(1, int(len(data) * (1 - test_size)))
    split_date = data.iloc[split_index]["date"]
    test_dates = sorted(data.loc[data["date"] >= split_date, "date"].unique())
    prediction_rows: list[dict[str, object]] = []

    for test_date in test_dates:
        train_matches = data[data["date"] < test_date].copy()
        test_matches = data[data["date"] == test_date].copy()
        if len(train_matches) < 10 or len(set(train_matches["result"])) < 3:
            continue

        training_features = create_training_features(train_matches)
        if len(set(training_features["result"])) < 3:
            continue
        model = train_outcome_model(training_features)

        fixtures = test_matches.copy()
        fixtures["team_a_score"] = pd.NA
        fixtures["team_b_score"] = pd.NA
        fixtures["result"] = pd.NA
        prediction_features = create_prediction_features(train_matches, fixtures)
        predictions = HybridPredictor(model, xgboost_weight, poisson_weight).predict_matches(prediction_features)

        for index, prediction in enumerate(predictions):
            actual = test_matches.iloc[index]
            final_probs = _final_probability_array(prediction, str(actual["team_a"]), str(actual["team_b"]))
            prediction_rows.append(
                {
                    "date": str(pd.to_datetime(actual["date"]).date()),
                    "team_a": actual["team_a"],
                    "team_b": actual["team_b"],
                    "actual_result": actual["result"],
                    "predicted_result": prediction["final_prediction"],
                    "p_team_a_win": final_probs[0],
                    "p_draw": final_probs[1],
                    "p_team_b_win": final_probs[2],
                    "confidence": float(np.max(final_probs)),
                    "actual_scoreline": f"{int(actual['team_a_score'])}-{int(actual['team_b_score'])}",
                    "recommended_scoreline": prediction["recommended_scoreline"],
                    "actual_over_2_5": int(float(actual["team_a_score"]) + float(actual["team_b_score"]) > 2.5),
                    "predicted_over_2_5": int(prediction["goal_probabilities"]["over_2_5"] >= 0.5),
                    "over_2_5_probability": prediction["goal_probabilities"]["over_2_5"],
                    "both_teams_to_score_probability": prediction["goal_probabilities"]["both_teams_to_score"],
                    "expected_goals_team_a": prediction["expected_goals"][str(actual["team_a"])],
                    "expected_goals_team_b": prediction["expected_goals"][str(actual["team_b"])],
                }
            )

    predictions_frame = pd.DataFrame(prediction_rows)
    if predictions_frame.empty:
        raise ValueError("No backtest predictions could be produced. Add more chronological data.")
    return evaluate_prediction_frame(predictions_frame), predictions_frame


def evaluate_prediction_frame(predictions: pd.DataFrame) -> dict[str, object]:
    y_true = predictions["actual_result"].map(config.RESULT_TO_CLASS).astype(int).to_numpy()
    probabilities = predictions[["p_team_a_win", "p_draw", "p_team_b_win"]].to_numpy(dtype=float)
    y_pred = probabilities.argmax(axis=1)
    exact_scores = predictions["actual_scoreline"] == predictions["recommended_scoreline"]
    actual_draw_mask = predictions["actual_result"] == "draw"
    favorite_mask = predictions["predicted_result"] != "draw"

    metrics = {
        "rows": int(len(predictions)),
        "accuracy_1x2": float(np.mean(y_pred == y_true)),
        "draw_accuracy": float(np.mean(predictions.loc[actual_draw_mask, "predicted_result"] == "draw"))
        if actual_draw_mask.any()
        else None,
        "favorite_accuracy": float(
            np.mean(predictions.loc[favorite_mask, "predicted_result"] == predictions.loc[favorite_mask, "actual_result"])
        )
        if favorite_mask.any()
        else None,
        "exact_score_accuracy": float(np.mean(exact_scores)),
        "over_under_2_5_accuracy": float(np.mean(predictions["actual_over_2_5"] == predictions["predicted_over_2_5"])),
        "brier_score": multiclass_brier_score(y_true, probabilities),
        "log_loss": float(log_loss(y_true, probabilities, labels=[0, 1, 2])),
        "calibration_by_confidence_bucket": calibration_by_confidence(predictions),
    }
    return metrics


def multiclass_brier_score(y_true: np.ndarray, probabilities: np.ndarray) -> float:
    encoded = np.zeros_like(probabilities)
    encoded[np.arange(len(y_true)), y_true] = 1.0
    return float(np.mean(np.sum((probabilities - encoded) ** 2, axis=1)))


def calibration_by_confidence(predictions: pd.DataFrame) -> list[dict[str, object]]:
    rows = []
    for lower, upper in CONFIDENCE_BUCKETS:
        mask = (predictions["confidence"] >= lower) & (predictions["confidence"] < upper)
        bucket = predictions[mask]
        rows.append(
            {
                "bucket": f"{int(lower * 100)}-{int((upper if upper <= 1 else 1) * 100)}%",
                "count": int(len(bucket)),
                "average_confidence": float(bucket["confidence"].mean()) if len(bucket) else None,
                "accuracy": float((bucket["actual_result"] == bucket["predicted_result"]).mean())
                if len(bucket)
                else None,
            }
        )
    return rows


def save_backtest_outputs(
    metrics: dict[str, object],
    predictions: pd.DataFrame,
    output_dir: str | Path = config.OUTPUTS_DIR,
) -> None:
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    predictions.to_csv(output_path / "backtest_predictions.csv", index=False)
    with (output_path / "backtest_metrics.json").open("w", encoding="utf-8") as file:
        json.dump(metrics, file, indent=2)


def _final_probability_array(prediction: dict[str, object], team_a: str, team_b: str) -> np.ndarray:
    if "final_probability_array" in prediction:
        return np.array(prediction["final_probability_array"], dtype=float)
    probabilities = prediction["final_probabilities"]
    return np.array(
        [
            probabilities[f"{team_a.replace(' ', '_')}_win"],
            probabilities["draw"],
            probabilities[f"{team_b.replace(' ', '_')}_win"],
        ],
        dtype=float,
    )
