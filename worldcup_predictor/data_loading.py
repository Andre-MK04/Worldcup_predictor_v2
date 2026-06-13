from __future__ import annotations

from pathlib import Path

import pandas as pd

from worldcup_predictor import config


COLUMN_ALIASES = {
    "date": ["date", "match_date"],
    "team_a": ["team_a", "home_team", "team1", "home", "country_a"],
    "team_b": ["team_b", "away_team", "team2", "away", "country_b"],
    "team_a_score": ["team_a_score", "home_score", "team1_score", "score_a", "goals_team_a"],
    "team_b_score": ["team_b_score", "away_score", "team2_score", "score_b", "goals_team_b"],
    "team_a_xg": ["team_a_xg", "home_xg", "xg_team_a", "xg_for_team_a"],
    "team_b_xg": ["team_b_xg", "away_xg", "xg_team_b", "xg_for_team_b"],
    "team_a_rating": ["team_a_rating", "home_rating", "team1_rating", "elo_team_a", "home_elo"],
    "team_b_rating": ["team_b_rating", "away_rating", "team2_rating", "elo_team_b", "away_elo"],
    "team_a_fifa_rank": ["team_a_fifa_rank", "home_fifa_rank", "fifa_rank_team_a"],
    "team_b_fifa_rank": ["team_b_fifa_rank", "away_fifa_rank", "fifa_rank_team_b"],
}

OPTIONAL_COLUMNS = [
    "tournament",
    "stage",
    "round",
    "neutral_venue",
    "host_team",
    "rest_days_team_a",
    "rest_days_team_b",
    "match_importance",
]


def ensure_directories() -> None:
    for path in (config.DATA_DIR, config.MODELS_DIR, config.OUTPUTS_DIR):
        path.mkdir(parents=True, exist_ok=True)


def load_matches(path: str | Path = config.DEFAULT_MATCHES_PATH) -> pd.DataFrame:
    frame = pd.read_csv(path)
    return normalize_match_columns(frame)


def normalize_match_columns(frame: pd.DataFrame) -> pd.DataFrame:
    data = frame.copy()
    lower_lookup = {column.lower().strip(): column for column in data.columns}
    rename: dict[str, str] = {}
    for canonical, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            original = lower_lookup.get(alias)
            if original is not None:
                rename[original] = canonical
                break
    data = data.rename(columns=rename)

    required = ["date", "team_a", "team_b"]
    missing = [column for column in required if column not in data.columns]
    if missing:
        raise ValueError(f"Missing required match columns: {missing}")

    data["date"] = pd.to_datetime(data["date"], errors="coerce")
    if data["date"].isna().any():
        raise ValueError("Some match dates could not be parsed.")

    for column in ["team_a_score", "team_b_score", "team_a_xg", "team_b_xg"]:
        if column in data.columns:
            data[column] = pd.to_numeric(data[column], errors="coerce")
        else:
            data[column] = float("nan")

    for column in [
        "team_a_rating",
        "team_b_rating",
        "team_a_fifa_rank",
        "team_b_fifa_rank",
        "rest_days_team_a",
        "rest_days_team_b",
        "match_importance",
    ]:
        if column in data.columns:
            data[column] = pd.to_numeric(data[column], errors="coerce")

    for column in OPTIONAL_COLUMNS:
        if column not in data.columns:
            data[column] = pd.NA

    if "result" not in data.columns:
        data["result"] = data.apply(result_from_scores, axis=1)

    return data.sort_values(["date", "team_a", "team_b"]).reset_index(drop=True)


def result_from_scores(row: pd.Series) -> str | pd.NA:
    if pd.isna(row.get("team_a_score")) or pd.isna(row.get("team_b_score")):
        return pd.NA
    if float(row["team_a_score"]) > float(row["team_b_score"]):
        return "team_a_win"
    if float(row["team_a_score"]) < float(row["team_b_score"]):
        return "team_b_win"
    return "draw"
