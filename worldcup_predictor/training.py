from __future__ import annotations

import json
from pathlib import Path

from worldcup_predictor import config
from worldcup_predictor.data_loading import ensure_directories, load_matches
from worldcup_predictor.feature_engineering import create_training_features
from worldcup_predictor.xgboost_model import save_outcome_model, train_outcome_model


def train_from_csv(
    matches_path: str | Path = config.DEFAULT_MATCHES_PATH,
    model_path: str | Path = config.DEFAULT_MODEL_PATH,
):
    ensure_directories()
    matches = load_matches(matches_path)
    features = create_training_features(matches)
    model = train_outcome_model(features)
    save_outcome_model(model, model_path)
    features.to_csv(config.DEFAULT_FEATURES_PATH, index=False)
    metrics_path = config.OUTPUTS_DIR / "model_metrics.json"
    with metrics_path.open("w", encoding="utf-8") as file:
        json.dump(model.metrics, file, indent=2)
    return model, features
