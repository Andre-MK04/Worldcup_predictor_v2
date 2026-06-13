from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Protocol, TypeAlias, cast

import joblib
import numpy as np
import pandas as pd
from numpy.typing import NDArray
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, log_loss
from sklearn.pipeline import Pipeline

from worldcup_predictor import config


FloatArray: TypeAlias = NDArray[np.float64]


class ProbabilityEstimator(Protocol):
    def fit(self, x: pd.DataFrame, y: pd.Series) -> ProbabilityEstimator:
        ...

    def predict_proba(self, x: pd.DataFrame) -> FloatArray:
        ...


@dataclass
class TrainedOutcomeModel:
    estimator: ProbabilityEstimator
    feature_columns: list[str]
    class_order: list[int]
    model_type: str
    metrics: dict[str, object]


def train_outcome_model(
    feature_frame: pd.DataFrame,
    feature_columns: list[str] | None = None,
) -> TrainedOutcomeModel:
    columns = feature_columns or config.FEATURE_COLUMNS
    data = feature_frame.dropna(subset=["result"]).sort_values("date").reset_index(drop=True)
    if len(data) < 10:
        raise ValueError("Need at least 10 completed matches to train the outcome model.")
    classes_present = set(data["result"].dropna())
    missing = set(config.RESULT_LABELS) - classes_present
    if missing:
        raise ValueError(f"Training data is missing result classes: {sorted(missing)}")

    train_df, test_df = _chronological_split(data, config.TEST_SIZE)
    estimator, model_type = _build_estimator()
    x_train = _feature_matrix(train_df, columns)
    y_train = _result_class_labels(cast(pd.Series, train_df["result"]))
    y_test = _result_class_labels(cast(pd.Series, test_df["result"]))

    estimator.fit(x_train, y_train)
    probabilities = predict_outcome_probabilities(
        TrainedOutcomeModel(estimator, columns, [0, 1, 2], model_type, {}),
        test_df,
    )
    metrics = {
        "model_type": model_type,
        "train_rows": int(len(train_df)),
        "test_rows": int(len(test_df)),
        "feature_columns": columns,
        "accuracy": float(accuracy_score(y_test, probabilities.argmax(axis=1))),
        "log_loss": float(log_loss(y_test, probabilities, labels=[0, 1, 2])),
        "split_date_min_test": str(test_df["date"].min().date()),
        "training_date_utc": datetime.now(timezone.utc).isoformat(),
    }
    final_estimator, _ = _build_estimator()
    final_estimator.fit(
        _feature_matrix(data, columns),
        _result_class_labels(cast(pd.Series, data["result"])),
    )
    return TrainedOutcomeModel(final_estimator, columns, [0, 1, 2], model_type, metrics)


def predict_outcome_probabilities(model: TrainedOutcomeModel, feature_frame: pd.DataFrame) -> FloatArray:
    probabilities = np.asarray(
        model.estimator.predict_proba(_feature_matrix(feature_frame, model.feature_columns)),
        dtype=float,
    )
    aligned = np.zeros((len(feature_frame), 3), dtype=float)
    estimator_classes = _estimator_classes(model.estimator)
    for source_index, class_label in enumerate(estimator_classes):
        if int(class_label) in model.class_order:
            aligned[:, model.class_order.index(int(class_label))] = probabilities[:, source_index]
    aligned = np.clip(aligned, 1e-6, 1.0)
    return aligned / aligned.sum(axis=1, keepdims=True)


def save_outcome_model(model: TrainedOutcomeModel, path: str | Path = config.DEFAULT_MODEL_PATH) -> None:
    config.MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, path)


def load_outcome_model(path: str | Path = config.DEFAULT_MODEL_PATH) -> TrainedOutcomeModel:
    model = joblib.load(path)
    if not isinstance(model, TrainedOutcomeModel):
        raise TypeError(f"Model file does not contain a {TrainedOutcomeModel.__name__}.")
    return model


def _build_estimator() -> tuple[ProbabilityEstimator, str]:
    xgboost_pipeline = _build_xgboost_pipeline()
    if xgboost_pipeline is not None:
        return xgboost_pipeline, "xgboost_multi_softprob"
    return _build_fallback_pipeline(), "sklearn_hist_gradient_boosting_fallback"


def _build_xgboost_pipeline() -> ProbabilityEstimator | None:
    try:
        from xgboost import XGBClassifier
    except Exception:
        return None

    return cast(
        ProbabilityEstimator,
        Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="median")),
                (
                    "classifier",
                    XGBClassifier(
                        objective="multi:softprob",
                        num_class=3,
                        n_estimators=250,
                        learning_rate=0.04,
                        max_depth=3,
                        subsample=0.85,
                        colsample_bytree=0.85,
                        eval_metric="mlogloss",
                        random_state=config.RANDOM_STATE,
                    ),
                ),
            ]
        ),
    )


def _build_fallback_pipeline() -> ProbabilityEstimator:
    return cast(
        ProbabilityEstimator,
        Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="median")),
                (
                    "classifier",
                    HistGradientBoostingClassifier(
                        learning_rate=0.05,
                        max_iter=250,
                        l2_regularization=0.1,
                        random_state=config.RANDOM_STATE,
                    ),
                ),
            ]
        ),
    )


def _result_class_labels(results: pd.Series) -> pd.Series:
    return cast(pd.Series, results.replace(config.RESULT_TO_CLASS).astype(int))


def _feature_matrix(frame: pd.DataFrame, feature_columns: list[str]) -> pd.DataFrame:
    matrix = frame.copy()
    for column in feature_columns:
        if column not in matrix.columns:
            matrix[column] = np.nan
    numeric = matrix[feature_columns].copy()
    for column in feature_columns:
        numeric[column] = pd.to_numeric(numeric[column], errors="coerce")
    return cast(pd.DataFrame, numeric)


def _estimator_classes(estimator: ProbabilityEstimator) -> list[int]:
    classes = getattr(estimator, "classes_", None)
    if classes is None and isinstance(estimator, Pipeline):
        classifier = estimator.steps[-1][1]
        classes = getattr(classifier, "classes_", None)
    if classes is None:
        return [0, 1, 2]
    return [int(label) for label in list(classes)]


def _chronological_split(frame: pd.DataFrame, test_size: float) -> tuple[pd.DataFrame, pd.DataFrame]:
    split_index = max(1, int(len(frame) * (1 - test_size)))
    split_index = min(split_index, len(frame) - 1)
    return frame.iloc[:split_index].copy(), frame.iloc[split_index:].copy()
