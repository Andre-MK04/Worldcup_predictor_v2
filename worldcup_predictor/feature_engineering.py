from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass

import numpy as np
import pandas as pd

from worldcup_predictor import config
from worldcup_predictor.data_loading import normalize_match_columns


@dataclass(frozen=True)
class TeamMatchRecord:
    date: pd.Timestamp
    goals_for: float
    goals_against: float
    xg_for: float | None
    xg_against: float | None
    points: float


def create_training_features(matches: pd.DataFrame) -> pd.DataFrame:
    normalized = normalize_match_columns(matches)
    features = create_feature_frame(normalized, include_future_rows=False)
    return features.dropna(subset=["result"]).reset_index(drop=True)


def create_prediction_features(
    historical_matches: pd.DataFrame,
    fixtures: pd.DataFrame,
) -> pd.DataFrame:
    history = normalize_match_columns(historical_matches)
    future = normalize_match_columns(fixtures)
    future["result"] = pd.NA
    future["team_a_score"] = np.nan
    future["team_b_score"] = np.nan
    future["is_prediction_fixture"] = True
    history["is_prediction_fixture"] = False
    combined = pd.concat([history, future], ignore_index=True, sort=False)
    features = create_feature_frame(combined, include_future_rows=True)
    return features[features["is_prediction_fixture"]].reset_index(drop=True)


def create_feature_frame(matches: pd.DataFrame, include_future_rows: bool = False) -> pd.DataFrame:
    data = normalize_match_columns(matches)
    if "is_prediction_fixture" not in data.columns:
        data["is_prediction_fixture"] = False
    data["is_prediction_fixture"] = data["is_prediction_fixture"].fillna(False)
    dataset_average_scored = _safe_mean(
        pd.concat([data["team_a_score"], data["team_b_score"]], ignore_index=True),
        config.BASE_GOAL_RATE,
    )
    dataset_average_xg = _safe_mean(
        pd.concat([data["team_a_xg"], data["team_b_xg"]], ignore_index=True),
        dataset_average_scored,
    )
    base_goal_rate = dataset_average_xg if _has_any(data, ["team_a_xg", "team_b_xg"]) else dataset_average_scored

    team_history: dict[str, list[TeamMatchRecord]] = defaultdict(list)
    rows: list[dict[str, object]] = []
    ordered = data.sort_values(["date", "is_prediction_fixture", "team_a", "team_b"]).reset_index(drop=True)

    for match_date, same_day in ordered.groupby("date", sort=True):
        pending_records: list[tuple[str, TeamMatchRecord]] = []
        for _, match in same_day.iterrows():
            if include_future_rows or pd.notna(match.get("result")):
                rows.append(_features_for_match(match, team_history, base_goal_rate))
            if pd.notna(match.get("team_a_score")) and pd.notna(match.get("team_b_score")):
                pending_records.extend(_records_from_completed_match(match, match_date))

        for team, record in pending_records:
            team_history[team].append(record)

    return pd.DataFrame(rows)


def _features_for_match(
    match: pd.Series,
    team_history: dict[str, list[TeamMatchRecord]],
    base_goal_rate: float,
) -> dict[str, object]:
    team_a = str(match["team_a"])
    team_b = str(match["team_b"])
    stats_a = _rolling_team_stats(team_history[team_a], match["date"])
    stats_b = _rolling_team_stats(team_history[team_b], match["date"])

    rating_a = _number(match.get("team_a_rating"), config.DEFAULT_TEAM_RATING)
    rating_b = _number(match.get("team_b_rating"), config.DEFAULT_TEAM_RATING)
    rank_a = _number(match.get("team_a_fifa_rank"), config.DEFAULT_FIFA_RANK)
    rank_b = _number(match.get("team_b_fifa_rank"), config.DEFAULT_FIFA_RANK)

    neutral_venue = _flag(match.get("neutral_venue"), default=1)
    host_advantage = _host_advantage(team_a, team_b, match)
    stage = _text(match.get("stage"), _text(match.get("round"), "")).lower()
    tournament = _text(match.get("tournament"), "").lower()
    is_world_cup = int("world cup" in tournament)
    is_qualifier = int("qualifier" in tournament or "qualification" in tournament)
    is_friendly = int("friendly" in tournament)

    attack_a = _strength(stats_a["xg_last_10"], stats_a["goals_scored_last_10"], base_goal_rate)
    attack_b = _strength(stats_b["xg_last_10"], stats_b["goals_scored_last_10"], base_goal_rate)
    defensive_a = _strength(stats_a["xg_conceded_last_10"], stats_a["goals_conceded_last_10"], base_goal_rate)
    defensive_b = _strength(stats_b["xg_conceded_last_10"], stats_b["goals_conceded_last_10"], base_goal_rate)

    row: dict[str, object] = {
        "date": match["date"],
        "team_a": team_a,
        "team_b": team_b,
        "result": match.get("result", pd.NA),
        "team_a_score": match.get("team_a_score", pd.NA),
        "team_b_score": match.get("team_b_score", pd.NA),
        "is_prediction_fixture": bool(match.get("is_prediction_fixture", False)),
        "base_goal_rate": base_goal_rate,
        "team_a_rating": rating_a,
        "team_b_rating": rating_b,
        "rating_difference": rating_a - rating_b,
        "team_a_fifa_rank": rank_a,
        "team_b_fifa_rank": rank_b,
        "fifa_rank_difference": rank_b - rank_a,
        "team_a_attack_strength": attack_a,
        "team_b_attack_strength": attack_b,
        "team_a_defensive_strength": defensive_a,
        "team_b_defensive_strength": defensive_b,
        "neutral_venue": neutral_venue,
        "host_advantage": host_advantage,
        "rest_days_difference": _number(match.get("rest_days_team_a"), stats_a["rest_days"])
        - _number(match.get("rest_days_team_b"), stats_b["rest_days"]),
        "tournament_stage": stage,
        "match_importance": _number(match.get("match_importance"), _stage_importance(stage, tournament)),
        "is_world_cup": is_world_cup,
        "is_qualifier": is_qualifier,
        "is_friendly": is_friendly,
    }
    row.update(_prefix_stats("team_a", stats_a))
    row.update(_prefix_stats("team_b", stats_b))
    return row


def _rolling_team_stats(records: list[TeamMatchRecord], match_date: pd.Timestamp) -> dict[str, float]:
    past = [record for record in records if record.date < match_date]
    last_5 = past[-5:]
    last_10 = past[-10:]

    # Rolling features only use matches already in team_history, so a match never sees its own
    # result or later results. Same-day records are appended after every match on that date.
    stats = {
        "rest_days": float((match_date - past[-1].date).days) if past else 7.0,
        "matches_last_5": float(len(last_5)),
        "matches_last_10": float(len(last_10)),
    }
    for window, rows in [(5, last_5), (10, last_10)]:
        stats[f"goals_scored_last_{window}"] = _mean_attr(rows, "goals_for", config.BASE_GOAL_RATE)
        stats[f"goals_conceded_last_{window}"] = _mean_attr(rows, "goals_against", config.BASE_GOAL_RATE)
        stats[f"goal_difference_last_{window}"] = stats[f"goals_scored_last_{window}"] - stats[f"goals_conceded_last_{window}"]
        stats[f"points_per_game_last_{window}"] = _mean_attr(rows, "points", 1.0)
        stats[f"xg_last_{window}"] = _mean_optional_attr(rows, "xg_for", stats[f"goals_scored_last_{window}"])
        stats[f"xg_conceded_last_{window}"] = _mean_optional_attr(
            rows,
            "xg_against",
            stats[f"goals_conceded_last_{window}"],
        )
    stats["xg_difference_last_10"] = stats["xg_last_10"] - stats["xg_conceded_last_10"]
    stats["win_rate_last_10"] = _rate(last_10, lambda record: record.points == 3.0, 0.33)
    stats["draw_rate_last_10"] = _rate(last_10, lambda record: record.points == 1.0, 0.27)
    stats["loss_rate_last_10"] = _rate(last_10, lambda record: record.points == 0.0, 0.40)
    stats["clean_sheet_rate_last_10"] = _rate(last_10, lambda record: record.goals_against == 0.0, 0.25)
    stats["failed_to_score_rate_last_10"] = _rate(last_10, lambda record: record.goals_for == 0.0, 0.25)
    return stats


def _records_from_completed_match(match: pd.Series, match_date: pd.Timestamp) -> list[tuple[str, TeamMatchRecord]]:
    goals_a = float(match["team_a_score"])
    goals_b = float(match["team_b_score"])
    xg_a = None if pd.isna(match.get("team_a_xg")) else float(match["team_a_xg"])
    xg_b = None if pd.isna(match.get("team_b_xg")) else float(match["team_b_xg"])
    points_a, points_b = (3.0, 0.0) if goals_a > goals_b else (0.0, 3.0) if goals_b > goals_a else (1.0, 1.0)
    return [
        (
            str(match["team_a"]),
            TeamMatchRecord(match_date, goals_a, goals_b, xg_a, xg_b, points_a),
        ),
        (
            str(match["team_b"]),
            TeamMatchRecord(match_date, goals_b, goals_a, xg_b, xg_a, points_b),
        ),
    ]


def _prefix_stats(prefix: str, stats: dict[str, float]) -> dict[str, float]:
    return {f"{prefix}_{name}": value for name, value in stats.items()}


def _strength(primary: float, fallback: float, average: float) -> float:
    value = primary if np.isfinite(primary) else fallback
    return float(np.clip(value / max(average, 0.1), 0.25, 3.0))


def _mean_attr(records: list[TeamMatchRecord], attr: str, default: float) -> float:
    if not records:
        return float(default)
    return float(np.mean([getattr(record, attr) for record in records]))


def _mean_optional_attr(records: list[TeamMatchRecord], attr: str, default: float) -> float:
    values = [getattr(record, attr) for record in records if getattr(record, attr) is not None]
    if not values:
        return float(default)
    return float(np.mean(values))


def _rate(records: list[TeamMatchRecord], predicate, default: float) -> float:
    if not records:
        return float(default)
    return float(np.mean([1.0 if predicate(record) else 0.0 for record in records]))


def _safe_mean(values: pd.Series, default: float) -> float:
    numeric = pd.to_numeric(values, errors="coerce").dropna()
    if numeric.empty:
        return float(default)
    return float(numeric.mean())


def _has_any(frame: pd.DataFrame, columns: list[str]) -> bool:
    return any(column in frame.columns and frame[column].notna().any() for column in columns)


def _number(value: object, default: float) -> float:
    numeric = pd.to_numeric(pd.Series([value]), errors="coerce").iloc[0]
    if pd.isna(numeric) or not np.isfinite(float(numeric)):
        return float(default)
    return float(numeric)


def _flag(value: object, default: int = 0) -> int:
    if pd.isna(value):
        return default
    if isinstance(value, str):
        return int(value.strip().lower() in {"1", "true", "yes", "y", "neutral"})
    return int(bool(value))


def _text(value: object, default: str) -> str:
    if pd.isna(value):
        return default
    return str(value)


def _host_advantage(team_a: str, team_b: str, match: pd.Series) -> int:
    host = match.get("host_team")
    if pd.isna(host):
        return 0
    host = str(host)
    if host == team_a:
        return 1
    if host == team_b:
        return -1
    return 0


def _stage_importance(stage: str, tournament: str) -> float:
    text = f"{stage} {tournament}"
    if "final" in text:
        return 1.0
    if "semi" in text or "quarter" in text or "knockout" in text or "round of" in text:
        return 0.8
    if "world cup" in text:
        return 0.7
    if "qualifier" in text or "qualification" in text:
        return 0.6
    if "friendly" in text:
        return 0.2
    return 0.5
