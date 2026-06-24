from __future__ import annotations

from .group_tables import calculate_group_standings


def calculate_live_table(results: list[dict[str, str]], fixtures: list[dict[str, str]]) -> list[dict[str, str]]:
    return calculate_group_standings(results, fixtures)


def simulate_remaining_group_matches(
    live_results: list[dict[str, str]],
    fixtures: list[dict[str, str]],
    predictions: list[dict[str, str]],
) -> list[dict[str, str]]:
    predicted_by_match = {prediction.get("match_id", ""): prediction for prediction in predictions}
    completed_ids = {result.get("match_id", "") for result in live_results if result.get("status") == "complete"}
    simulated = list(live_results)
    for fixture in fixtures:
        match_id = fixture.get("match_id", "")
        if match_id in completed_ids:
            continue
        prediction = predicted_by_match.get(match_id)
        if not prediction:
            continue
        score = prediction.get("most_likely_single_scoreline", "")
        try:
            goals_a, goals_b = [int(value) for value in score.replace("–", "-").split("-", 1)]
        except ValueError:
            continue
        simulated.append(
            {
                "match_id": match_id,
                "date": fixture.get("date", ""),
                "group": fixture.get("group", ""),
                "stage": fixture.get("stage", ""),
                "team_a": fixture.get("team_a", ""),
                "team_b": fixture.get("team_b", ""),
                "status": "complete",
                "team_a_goals": str(goals_a),
                "team_b_goals": str(goals_b),
                "winner_country": predicted_winner(fixture, goals_a, goals_b),
                "result_label": result_label(goals_a, goals_b),
                "total_goals": str(goals_a + goals_b),
                "both_teams_scored": str(goals_a > 0 and goals_b > 0).lower(),
                "over_2_5": str(goals_a + goals_b > 2.5).lower(),
                "updated_at": "",
            }
        )
    return simulated


def calculate_projected_final_table(
    live_results: list[dict[str, str]],
    fixtures: list[dict[str, str]],
    predictions: list[dict[str, str]],
) -> list[dict[str, str]]:
    simulated_results = simulate_remaining_group_matches(live_results, fixtures, predictions)
    return calculate_group_standings(simulated_results, fixtures)


def compare_live_vs_projected(live_table: list[dict[str, str]], projected_table: list[dict[str, str]]) -> list[dict[str, str]]:
    projected_by_team = {(row["group"], row["country"]): row for row in projected_table}
    comparison = []
    for live_row in live_table:
        projected = projected_by_team.get((live_row["group"], live_row["country"]))
        comparison.append(
            {
                **live_row,
                "projected_points": projected.get("points", live_row["points"]) if projected else live_row["points"],
                "projected_rank": projected.get("rank", live_row["rank"]) if projected else live_row["rank"],
            }
        )
    return comparison


def predicted_winner(fixture: dict[str, str], goals_a: int, goals_b: int) -> str:
    if goals_a > goals_b:
        return fixture.get("team_a", "")
    if goals_b > goals_a:
        return fixture.get("team_b", "")
    return "Draw"


def result_label(goals_a: int, goals_b: int) -> str:
    if goals_a > goals_b:
        return "team_a_win"
    if goals_b > goals_a:
        return "team_b_win"
    return "draw"
