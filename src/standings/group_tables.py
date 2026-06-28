from __future__ import annotations

import csv
from collections import defaultdict
from pathlib import Path


STANDING_FIELDS = [
    "group",
    "country",
    "played",
    "wins",
    "draws",
    "losses",
    "goals_for",
    "goals_against",
    "goal_difference",
    "points",
    "rank",
    "qualification_status",
]


def calculate_group_standings(results: list[dict[str, str]], fixtures: list[dict[str, str]]) -> list[dict[str, str]]:
    teams_by_group: dict[str, set[str]] = defaultdict(set)
    for fixture in fixtures:
        group = fixture.get("group", "")
        if fixture.get("stage") != "group" or not group:
            continue
        if fixture.get("team_a"):
            teams_by_group[group].add(fixture["team_a"])
        if fixture.get("team_b"):
            teams_by_group[group].add(fixture["team_b"])

    rows: dict[tuple[str, str], dict[str, int | str]] = {}
    for group, teams in teams_by_group.items():
        for team in teams:
            rows[(group, team)] = {
                "group": group,
                "country": team,
                "played": 0,
                "wins": 0,
                "draws": 0,
                "losses": 0,
                "goals_for": 0,
                "goals_against": 0,
                "goal_difference": 0,
                "points": 0,
                "rank": 0,
                "qualification_status": "unknown",
            }

    for result in results:
        if normalize_status(result.get("status", "")) != "complete":
            continue
        if result.get("stage") != "group":
            continue
        group = result.get("group", "")
        if not group:
            continue
        team_a = result.get("team_a", "")
        team_b = result.get("team_b", "")
        if not team_a or not team_b:
            continue
        try:
            goals_a = int(float(result.get("team_a_goals", "")))
            goals_b = int(float(result.get("team_b_goals", "")))
        except ValueError:
            continue
        rows.setdefault((group, team_a), empty_row(group, team_a))
        rows.setdefault((group, team_b), empty_row(group, team_b))
        apply_team_result(rows[(group, team_a)], goals_a, goals_b)
        apply_team_result(rows[(group, team_b)], goals_b, goals_a)

    ranked_rows: list[dict[str, str]] = []
    for group in sorted(teams_by_group):
        group_rows = [rows[(group, team)] for team in teams_by_group[group]]
        for index, row in enumerate(rank_group(group_rows), start=1):
            row["rank"] = index
            row["qualification_status"] = "possible"
            ranked_rows.append({field: str(row[field]) for field in STANDING_FIELDS})
    return ranked_rows


def apply_group_tiebreakers(rows: list[dict[str, int | str]]) -> list[dict[str, int | str]]:
    return rank_group(rows)


def rank_group(rows: list[dict[str, int | str]]) -> list[dict[str, int | str]]:
    return sorted(
        rows,
        key=lambda row: (
            -int(row["points"]),
            -int(row["goal_difference"]),
            -int(row["goals_for"]),
            str(row["country"]),
        ),
    )


def calculate_team_record(results: list[dict[str, str]], country: str) -> dict[str, int]:
    record = {"played": 0, "wins": 0, "draws": 0, "losses": 0, "goals_for": 0, "goals_against": 0, "points": 0}
    for result in results:
        if normalize_status(result.get("status", "")) != "complete":
            continue
        if result.get("team_a") == country:
            goals_for = int(float(result.get("team_a_goals", 0)))
            goals_against = int(float(result.get("team_b_goals", 0)))
        elif result.get("team_b") == country:
            goals_for = int(float(result.get("team_b_goals", 0)))
            goals_against = int(float(result.get("team_a_goals", 0)))
        else:
            continue
        apply_team_result(record, goals_for, goals_against)
    return record


def export_live_group_standings(rows: list[dict[str, str]], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=STANDING_FIELDS)
        writer.writeheader()
        writer.writerows(rows)


def empty_row(group: str, country: str) -> dict[str, int | str]:
    return {
        "group": group,
        "country": country,
        "played": 0,
        "wins": 0,
        "draws": 0,
        "losses": 0,
        "goals_for": 0,
        "goals_against": 0,
        "goal_difference": 0,
        "points": 0,
        "rank": 0,
        "qualification_status": "unknown",
    }


def apply_team_result(row: dict[str, int | str], goals_for: int, goals_against: int) -> None:
    row["played"] = int(row["played"]) + 1
    row["goals_for"] = int(row["goals_for"]) + goals_for
    row["goals_against"] = int(row["goals_against"]) + goals_against
    row["goal_difference"] = int(row["goals_for"]) - int(row["goals_against"])
    if goals_for > goals_against:
        row["wins"] = int(row["wins"]) + 1
        row["points"] = int(row["points"]) + 3
    elif goals_for == goals_against:
        row["draws"] = int(row["draws"]) + 1
        row["points"] = int(row["points"]) + 1
    else:
        row["losses"] = int(row["losses"]) + 1


def normalize_status(status: str) -> str:
    if status in {"completed", "finished", "final"}:
        return "complete"
    return status
