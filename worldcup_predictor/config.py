from __future__ import annotations

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"
MODELS_DIR = PROJECT_ROOT / "models"
OUTPUTS_DIR = PROJECT_ROOT / "outputs"

DEFAULT_MATCHES_PATH = DATA_DIR / "matches.csv"
DEFAULT_MODEL_PATH = MODELS_DIR / "hybrid_xgboost_model.joblib"
DEFAULT_FEATURES_PATH = OUTPUTS_DIR / "training_features.csv"

RESULT_LABELS = ["team_a_win", "draw", "team_b_win"]
RESULT_TO_CLASS = {"team_a_win": 0, "draw": 1, "team_b_win": 2}
CLASS_TO_RESULT = {value: key for key, value in RESULT_TO_CLASS.items()}

XGBOOST_WEIGHT = 0.6
POISSON_WEIGHT = 0.4
RANDOM_STATE = 42
TEST_SIZE = 0.2

BASE_GOAL_RATE = 1.35
EXPECTED_GOALS_MIN = 0.15
EXPECTED_GOALS_MAX = 4.5
SCORE_MATRIX_MAX_GOALS = 7

DEFAULT_TEAM_RATING = 1500.0
DEFAULT_FIFA_RANK = 100.0

FEATURE_COLUMNS = [
    "rating_difference",
    "fifa_rank_difference",
    "team_a_goals_scored_last_10",
    "team_b_goals_scored_last_10",
    "team_a_goals_conceded_last_10",
    "team_b_goals_conceded_last_10",
    "team_a_xg_last_10",
    "team_b_xg_last_10",
    "team_a_xg_conceded_last_10",
    "team_b_xg_conceded_last_10",
    "team_a_points_per_game_last_10",
    "team_b_points_per_game_last_10",
    "team_a_clean_sheet_rate_last_10",
    "team_b_clean_sheet_rate_last_10",
    "team_a_failed_to_score_rate_last_10",
    "team_b_failed_to_score_rate_last_10",
    "team_a_attack_strength",
    "team_b_attack_strength",
    "team_a_defensive_strength",
    "team_b_defensive_strength",
    "neutral_venue",
    "host_advantage",
    "rest_days_difference",
    "match_importance",
    "is_world_cup",
    "is_qualifier",
    "is_friendly",
]
