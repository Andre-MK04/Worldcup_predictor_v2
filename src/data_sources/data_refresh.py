from __future__ import annotations

import csv
import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from src.standings.group_tables import calculate_group_standings, export_live_group_standings

from .api_football_provider import ApiFootballProvider
from .fifa_provider import FifaProvider
from .local_csv_provider import LocalCsvProvider
from .static_schedule import build_static_group_fixtures


DATA_DIR = Path("data")
PROCESSED_DIR = DATA_DIR / "processed"
OUTPUTS_DIR = Path("outputs")

FIXTURE_FIELDS = [
    "match_id",
    "date",
    "kickoff_time",
    "group",
    "stage",
    "team_a",
    "team_b",
    "team_a_code",
    "team_b_code",
    "venue",
    "status",
    "is_neutral_venue",
    "fifa_match_number",
]
RESULT_FIELDS = [
    "match_id",
    "date",
    "group",
    "stage",
    "team_a",
    "team_b",
    "status",
    "team_a_goals",
    "team_b_goals",
    "winner_country",
    "result_label",
    "total_goals",
    "both_teams_scored",
    "over_2_5",
    "updated_at",
]
PREDICTION_FIELDS = [
    "match_id",
    "generated_at",
    "team_a",
    "team_b",
    "p_team_a_win_final",
    "p_draw_final",
    "p_team_b_win_final",
    "predicted_winner_country",
    "predicted_result_label",
    "expected_goals_team_a",
    "expected_goals_team_b",
    "expected_total_goals",
    "most_likely_single_scoreline",
    "top_5_scorelines",
    "p_over_2_5_goals",
    "p_both_teams_to_score",
    "confidence_label",
]
SNAPSHOT_FIELDS = ["snapshot_id", *PREDICTION_FIELDS[:2], "prediction_locked", *PREDICTION_FIELDS[2:]]
MATCH_EVALUATION_FIELDS = [
    "match_id",
    "date",
    "group",
    "stage",
    "team_a",
    "team_b",
    "eligible_for_evaluation",
    "evaluation_status",
    "ineligibility_reason",
    "actual_score",
    "actual_scoreline",
    "actual_result_label",
    "predicted_result_label",
    "predicted_winner_country",
    "p_team_a_win",
    "p_draw",
    "p_team_b_win",
    "prediction_correct",
    "expected_goals_team_a",
    "expected_goals_team_b",
    "actual_goals_team_a",
    "actual_goals_team_b",
    "goal_error_team_a",
    "goal_error_team_b",
    "expected_total_goals",
    "actual_total_goals",
    "total_goals_error",
    "most_likely_single_scoreline",
    "exact_scoreline_correct",
    "top_5_scorelines",
    "actual_score_in_top_3",
    "actual_score_in_top_5",
    "predicted_over_2_5",
    "actual_over_2_5",
    "over_2_5_correct",
    "predicted_btts",
    "actual_btts",
    "btts_correct",
    "confidence_label",
    "snapshot_used_at",
]


def refresh_all_data() -> dict[str, object]:
    refreshed_at = now_iso()
    warnings: list[str] = []
    ensure_prediction_files()
    fixtures = refresh_fixtures(warnings)
    results, results_updated = refresh_results(fixtures, warnings)
    refresh_live_scores(warnings)
    lock_predictions_after_kickoff(fixtures)
    snapshots_created = regenerate_future_predictions(fixtures)
    standings = refresh_group_standings(fixtures, results)
    evaluation = update_evaluation_metrics(fixtures, results)

    complete_count = sum(1 for row in results if row.get("status") == "complete")
    live_count = sum(1 for row in results if row.get("status") == "live")
    scheduled_count = max(0, len(fixtures) - complete_count - live_count)
    report = {
        "refreshed_at": refreshed_at,
        "data_source": os.getenv("FOOTBALL_API_PROVIDER", "local_csv"),
        "matches_total": len(fixtures),
        "matches_complete": complete_count,
        "matches_live": live_count,
        "matches_scheduled": scheduled_count,
        "results_updated": results_updated,
        "standings_updated": bool(standings),
        "evaluation_updated": True,
        "snapshots_created": snapshots_created,
        "evaluated_matches": evaluation.get("evaluated_matches", 0),
        "not_eligible_matches": evaluation.get("not_eligible_matches", 0),
        "warnings": warnings,
    }
    write_json(OUTPUTS_DIR / "data_refresh_report.json", report)
    return report


def refresh_fixtures(warnings: list[str] | None = None) -> list[dict[str, str]]:
    warnings = warnings if warnings is not None else []
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    provider = select_provider()
    payload = provider.fetch_fixtures()
    warnings.extend(payload.warnings)
    fixtures = normalize_fixtures(payload.fixtures)
    if not fixtures:
        fixtures = build_static_group_fixtures()
        warnings.append("Using bundled official fixture schedule because no provider fixture CSV was available.")
    else:
        added = merge_static_fixtures(fixtures)
        if added:
            warnings.append(f"Added {added} bundled official fixture(s) missing from the provider fixture CSV.")
    write_csv(PROCESSED_DIR / "fixtures.csv", FIXTURE_FIELDS, fixtures)
    return fixtures


def refresh_results(fixtures: list[dict[str, str]] | None = None, warnings: list[str] | None = None) -> tuple[list[dict[str, str]], int]:
    warnings = warnings if warnings is not None else []
    provider = select_provider()
    payload = provider.fetch_results()
    warnings.extend(payload.warnings)
    incoming = normalize_results(payload.results)
    existing = read_csv(PROCESSED_DIR / "results.csv")
    existing_by_id = {row.get("match_id", ""): row for row in existing}
    updated_count = 0

    for row in incoming:
        match_id = row.get("match_id", "")
        if not match_id:
            continue
        if existing_by_id.get(match_id) != row:
            updated_count += 1
        existing_by_id[match_id] = row

    results = list(existing_by_id.values())
    write_csv(PROCESSED_DIR / "results.csv", RESULT_FIELDS, results)
    return results, updated_count


def refresh_live_scores(warnings: list[str] | None = None) -> list[dict[str, str]]:
    if warnings is not None:
        warnings.append("Live score polling uses the configured provider results payload; no separate paid live endpoint is called.")
    return read_csv(PROCESSED_DIR / "results.csv")


def refresh_group_standings(
    fixtures: list[dict[str, str]] | None = None,
    results: list[dict[str, str]] | None = None,
) -> list[dict[str, str]]:
    fixtures = fixtures if fixtures is not None else read_csv(PROCESSED_DIR / "fixtures.csv")
    results = results if results is not None else read_csv(PROCESSED_DIR / "results.csv")
    standings = calculate_group_standings(results, fixtures)
    export_live_group_standings(standings, PROCESSED_DIR / "live_group_standings.csv")
    return standings


def save_prediction_snapshot(prediction: dict[str, str], fixture: dict[str, str], generated_at: str | None = None) -> bool:
    generated_at = generated_at or prediction.get("generated_at") or now_iso()
    kickoff = fixture_kickoff(fixture)
    if parse_datetime(generated_at) >= kickoff:
        return False
    snapshots = read_csv(PROCESSED_DIR / "prediction_snapshots.csv")
    normalized = normalize_prediction(prediction)
    snapshot = {
        "snapshot_id": str(uuid.uuid4()),
        "prediction_locked": str(parse_datetime(generated_at) >= kickoff).lower(),
        **normalized,
        "generated_at": generated_at,
    }
    snapshots.append(snapshot)
    write_csv(PROCESSED_DIR / "prediction_snapshots.csv", SNAPSHOT_FIELDS, snapshots)
    return True


def lock_predictions_after_kickoff(fixtures: list[dict[str, str]] | None = None) -> int:
    fixtures = fixtures if fixtures is not None else read_csv(PROCESSED_DIR / "fixtures.csv")
    fixture_by_id = {fixture.get("match_id", ""): fixture for fixture in fixtures}
    snapshots = read_csv(PROCESSED_DIR / "prediction_snapshots.csv")
    locked = 0
    now = datetime.now(timezone.utc)
    for snapshot in snapshots:
        fixture = fixture_by_id.get(snapshot.get("match_id", ""))
        if fixture and now >= fixture_kickoff(fixture) and snapshot.get("prediction_locked") != "true":
            snapshot["prediction_locked"] = "true"
            locked += 1
    write_csv(PROCESSED_DIR / "prediction_snapshots.csv", SNAPSHOT_FIELDS, snapshots)
    return locked


def regenerate_future_predictions(fixtures: list[dict[str, str]] | None = None) -> int:
    fixtures = fixtures if fixtures is not None else read_csv(PROCESSED_DIR / "fixtures.csv")
    predictions = read_csv(PROCESSED_DIR / "predictions.csv")
    if not predictions:
        return 0
    fixture_by_id = {fixture.get("match_id", ""): fixture for fixture in fixtures}
    now = datetime.now(timezone.utc)
    snapshots_created = 0
    for prediction in predictions:
        fixture = fixture_by_id.get(prediction.get("match_id", ""))
        if not fixture or now >= fixture_kickoff(fixture):
            continue
        if save_prediction_snapshot(prediction, fixture):
            snapshots_created += 1
    return snapshots_created


def ensure_prediction_files() -> None:
    if not (PROCESSED_DIR / "predictions.csv").exists():
        write_csv(PROCESSED_DIR / "predictions.csv", PREDICTION_FIELDS, [])
    if not (PROCESSED_DIR / "prediction_snapshots.csv").exists():
        write_csv(PROCESSED_DIR / "prediction_snapshots.csv", SNAPSHOT_FIELDS, [])


def update_evaluation_metrics(
    fixtures: list[dict[str, str]] | None = None,
    results: list[dict[str, str]] | None = None,
) -> dict[str, object]:
    fixtures = fixtures if fixtures is not None else read_csv(PROCESSED_DIR / "fixtures.csv")
    results = results if results is not None else read_csv(PROCESSED_DIR / "results.csv")
    snapshots = read_csv(PROCESSED_DIR / "prediction_snapshots.csv")
    fixture_by_id = {fixture.get("match_id", ""): fixture for fixture in fixtures}
    snapshots_by_match: dict[str, list[dict[str, str]]] = {}
    for snapshot in snapshots:
        snapshots_by_match.setdefault(snapshot.get("match_id", ""), []).append(snapshot)

    rows: list[dict[str, str]] = []
    eligible_rows: list[dict[str, str]] = []
    for result in results:
        if result.get("status") != "complete":
            continue
        fixture = fixture_by_id.get(result.get("match_id", "")) or find_fixture_for_result(result, fixtures)
        if not fixture:
            continue
        snapshot = latest_pre_kickoff_snapshot(snapshots_by_match.get(result.get("match_id", ""), []), fixture)
        row = evaluate_match(result, fixture, snapshot)
        rows.append(row)
        if row["eligible_for_evaluation"] == "true":
            eligible_rows.append(row)

    write_csv(OUTPUTS_DIR / "match_evaluation.csv", MATCH_EVALUATION_FIELDS, rows)
    summary = summarize_evaluation(eligible_rows, len(rows) - len(eligible_rows))
    write_json(OUTPUTS_DIR / "model_performance_summary.json", summary)
    write_json(OUTPUTS_DIR / "performance_summary.json", summary)
    return summary


def latest_pre_kickoff_snapshot(snapshots: list[dict[str, str]], fixture: dict[str, str]) -> dict[str, str] | None:
    kickoff = fixture_kickoff(fixture)
    eligible = [snapshot for snapshot in snapshots if parse_datetime(snapshot.get("generated_at", "")) < kickoff]
    if not eligible:
        return None
    return max(eligible, key=lambda snapshot: parse_datetime(snapshot.get("generated_at", "")))


def find_fixture_for_result(result: dict[str, str], fixtures: list[dict[str, str]]) -> dict[str, str] | None:
    result_teams = {result.get("team_a", ""), result.get("team_b", "")}
    result_group = result.get("group", "")
    for fixture in fixtures:
        fixture_teams = {fixture.get("team_a", ""), fixture.get("team_b", "")}
        if fixture_teams == result_teams and fixture.get("group", "") == result_group:
            return fixture
    return None


def evaluate_match(result: dict[str, str], fixture: dict[str, str], snapshot: dict[str, str] | None) -> dict[str, str]:
    goals_a = int(float(result.get("team_a_goals", 0)))
    goals_b = int(float(result.get("team_b_goals", 0)))
    actual_score = f"{goals_a}-{goals_b}"
    actual_result = result.get("result_label") or result_label(goals_a, goals_b)
    base = {
        "match_id": result.get("match_id", ""),
        "date": result.get("date", fixture.get("date", "")),
        "group": result.get("group", fixture.get("group", "")),
        "stage": result.get("stage", fixture.get("stage", "")),
        "team_a": result.get("team_a", fixture.get("team_a", "")),
        "team_b": result.get("team_b", fixture.get("team_b", "")),
        "actual_score": actual_score,
        "actual_scoreline": actual_score,
        "actual_result_label": actual_result,
        "actual_goals_team_a": str(goals_a),
        "actual_goals_team_b": str(goals_b),
        "actual_total_goals": str(goals_a + goals_b),
        "actual_over_2_5": str(goals_a + goals_b > 2.5).lower(),
        "actual_btts": str(goals_a > 0 and goals_b > 0).lower(),
    }
    if snapshot is None:
        return {
            **empty_evaluation_row(),
            **base,
            "eligible_for_evaluation": "false",
            "evaluation_status": "not_eligible_for_evaluation",
            "ineligibility_reason": "not eligible for evaluation: no pre-kickoff prediction snapshot",
        }

    expected_a = float(snapshot.get("expected_goals_team_a") or 0)
    expected_b = float(snapshot.get("expected_goals_team_b") or 0)
    raw_top_scorelines = snapshot.get("top_5_scorelines", "")
    top_scores = parse_top_scorelines(raw_top_scorelines)
    predicted_score = normalize_score(snapshot.get("most_likely_single_scoreline", ""))
    actual_score = normalize_score(actual_score)
    predicted_over = float(snapshot.get("p_over_2_5_goals") or 0) >= 0.5
    predicted_btts = float(snapshot.get("p_both_teams_to_score") or 0) >= 0.5
    return {
        **base,
        "eligible_for_evaluation": "true",
        "evaluation_status": "evaluated",
        "ineligibility_reason": "",
        "predicted_result_label": snapshot.get("predicted_result_label", ""),
        "predicted_winner_country": snapshot.get("predicted_winner_country", ""),
        "p_team_a_win": snapshot.get("p_team_a_win_final", ""),
        "p_draw": snapshot.get("p_draw_final", ""),
        "p_team_b_win": snapshot.get("p_team_b_win_final", ""),
        "prediction_correct": str(snapshot.get("predicted_result_label", "") == actual_result).lower(),
        "expected_goals_team_a": f"{expected_a:.3f}",
        "expected_goals_team_b": f"{expected_b:.3f}",
        "goal_error_team_a": f"{abs(expected_a - goals_a):.3f}",
        "goal_error_team_b": f"{abs(expected_b - goals_b):.3f}",
        "expected_total_goals": snapshot.get("expected_total_goals", f"{expected_a + expected_b:.3f}"),
        "total_goals_error": f"{abs((expected_a + expected_b) - (goals_a + goals_b)):.3f}",
        "most_likely_single_scoreline": predicted_score,
        "exact_scoreline_correct": str(predicted_score == actual_score).lower(),
        "top_5_scorelines": normalize_top_scorelines_for_output(raw_top_scorelines, top_scores),
        "actual_score_in_top_3": str(actual_score in top_scores[:3]).lower(),
        "actual_score_in_top_5": str(actual_score in top_scores[:5]).lower(),
        "predicted_over_2_5": str(predicted_over).lower(),
        "over_2_5_correct": str(predicted_over == (goals_a + goals_b > 2.5)).lower(),
        "predicted_btts": str(predicted_btts).lower(),
        "btts_correct": str(predicted_btts == (goals_a > 0 and goals_b > 0)).lower(),
        "confidence_label": snapshot.get("confidence_label", ""),
        "snapshot_used_at": snapshot.get("generated_at", ""),
    }


def summarize_evaluation(rows: list[dict[str, str]], not_eligible_matches: int) -> dict[str, object]:
    evaluated = len(rows)
    if evaluated == 0:
        return {
            "evaluated_matches": 0,
            "not_eligible_matches": not_eligible_matches,
            "correct_result_predictions": 0,
            "result_accuracy": None,
            "exact_scoreline_correct": 0,
            "exact_scoreline_accuracy": None,
            "top_5_scoreline_hits": 0,
            "top_5_scoreline_accuracy": None,
            "goal_mae_team_a": None,
            "goal_mae_team_b": None,
            "total_goals_mae": None,
            "over_2_5_accuracy": None,
            "both_teams_to_score_accuracy": None,
            "draw_precision": None,
            "draw_recall": None,
            "log_loss": None,
            "brier_score": None,
            "confidence_buckets": [],
            "prediction_type_breakdown": [],
            "accuracy_by_group": [],
            "draw_predictions_correct": 0,
            "winner_predictions_correct": 0,
            "last_updated": now_iso(),
            "message": "No completed match has a pre-kickoff prediction snapshot yet.",
        }

    correct_result = count_true(rows, "prediction_correct")
    exact = count_true(rows, "exact_scoreline_correct")
    top5 = count_true(rows, "actual_score_in_top_5")
    over = count_true(rows, "over_2_5_correct")
    btts = count_true(rows, "btts_correct")
    draw_predictions = [row for row in rows if row.get("predicted_result_label") == "draw"]
    actual_draws = [row for row in rows if row.get("actual_result_label") == "draw"]
    true_draws = [row for row in rows if row.get("predicted_result_label") == "draw" and row.get("actual_result_label") == "draw"]
    true_winners = [row for row in rows if row.get("predicted_result_label") != "draw" and row.get("prediction_correct") == "true"]

    return {
        "evaluated_matches": evaluated,
        "not_eligible_matches": not_eligible_matches,
        "correct_result_predictions": correct_result,
        "result_accuracy": correct_result / evaluated,
        "exact_scoreline_correct": exact,
        "exact_scoreline_accuracy": exact / evaluated,
        "top_5_scoreline_hits": top5,
        "top_5_scoreline_accuracy": top5 / evaluated,
        "goal_mae_team_a": average_float(rows, "goal_error_team_a"),
        "goal_mae_team_b": average_float(rows, "goal_error_team_b"),
        "total_goals_mae": average_float(rows, "total_goals_error"),
        "over_2_5_accuracy": over / evaluated,
        "both_teams_to_score_accuracy": btts / evaluated,
        "draw_precision": len(true_draws) / len(draw_predictions) if draw_predictions else None,
        "draw_recall": len(true_draws) / len(actual_draws) if actual_draws else None,
        "log_loss": calculate_log_loss(rows),
        "brier_score": calculate_brier_score(rows),
        "confidence_buckets": confidence_buckets(rows),
        "prediction_type_breakdown": prediction_type_breakdown(rows),
        "accuracy_by_group": accuracy_by_group(rows),
        "draw_predictions_correct": len(true_draws),
        "winner_predictions_correct": len(true_winners),
        "last_updated": now_iso(),
    }


def normalize_fixtures(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    fixtures = []
    for row in rows:
        fixture = {field: row.get(field, "") for field in FIXTURE_FIELDS}
        fixture["match_id"] = fixture["match_id"] or f"{fixture['team_a']}-{fixture['team_b']}-{fixture['date']}"
        fixture["status"] = normalize_status(fixture["status"] or "scheduled")
        fixtures.append(fixture)
    return fixtures


def merge_static_fixtures(fixtures: list[dict[str, str]]) -> int:
    existing_ids = {fixture.get("match_id", "") for fixture in fixtures}
    added = 0
    for fixture in build_static_group_fixtures():
        match_id = fixture.get("match_id", "")
        if match_id and match_id not in existing_ids:
            fixtures.append(fixture)
            existing_ids.add(match_id)
            added += 1
    return added


def normalize_results(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    normalized = []
    for row in rows:
        result = {field: row.get(field, "") for field in RESULT_FIELDS}
        result["status"] = normalize_status(result["status"] or "scheduled")
        try:
            goals_a = int(float(result.get("team_a_goals", "")))
            goals_b = int(float(result.get("team_b_goals", "")))
        except ValueError:
            normalized.append(result)
            continue
        result["result_label"] = result.get("result_label") or result_label(goals_a, goals_b)
        result["winner_country"] = result.get("winner_country") or winner_country(result, goals_a, goals_b)
        result["total_goals"] = str(goals_a + goals_b)
        result["both_teams_scored"] = str(goals_a > 0 and goals_b > 0).lower()
        result["over_2_5"] = str(goals_a + goals_b > 2.5).lower()
        result["updated_at"] = result.get("updated_at") or now_iso()
        normalized.append(result)
    return normalized


def normalize_prediction(row: dict[str, str]) -> dict[str, str]:
    prediction = {field: row.get(field, "") for field in PREDICTION_FIELDS}
    try:
        expected_total = float(prediction["expected_goals_team_a"]) + float(prediction["expected_goals_team_b"])
        prediction["expected_total_goals"] = prediction["expected_total_goals"] or f"{expected_total:.3f}"
    except ValueError:
        pass
    return prediction


def select_provider():
    provider = os.getenv("FOOTBALL_API_PROVIDER", "local_csv").lower()
    if provider == "fifa":
        return FifaProvider()
    if provider in {"api_football", "api-football"}:
        return ApiFootballProvider()
    return LocalCsvProvider(DATA_DIR)


def fixture_kickoff(fixture: dict[str, str]) -> datetime:
    value = f"{fixture.get('date', '')}T{fixture.get('kickoff_time') or '12:00'}:00+00:00"
    return parse_datetime(value)


def parse_datetime(value: str) -> datetime:
    if not value:
        return datetime.min.replace(tzinfo=timezone.utc)
    normalized = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        parsed = datetime.fromisoformat(f"{value}T00:00:00+00:00")
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def read_csv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open("r", newline="", encoding="utf-8") as handle:
        return [dict(row) for row in csv.DictReader(handle)]


def write_csv(path: Path, fields: list[str], rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def write_json(path: Path, payload: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_status(status: str) -> str:
    if status in {"completed", "finished", "final"}:
        return "complete"
    return status


def result_label(goals_a: int, goals_b: int) -> str:
    if goals_a > goals_b:
        return "team_a_win"
    if goals_b > goals_a:
        return "team_b_win"
    return "draw"


def winner_country(result: dict[str, str], goals_a: int, goals_b: int) -> str:
    if goals_a > goals_b:
        return result.get("team_a", "")
    if goals_b > goals_a:
        return result.get("team_b", "")
    return "Draw"


def normalize_score(score: str) -> str:
    return score.replace("–", "-").replace(" ", "")


def parse_top_scorelines(value: str) -> list[str]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
        if isinstance(parsed, list):
            return [normalize_score(str(item.get("score", item))) if isinstance(item, dict) else normalize_score(str(item)) for item in parsed]
    except json.JSONDecodeError:
        pass
    return [normalize_score(item) for item in value.split("|") if item]


def normalize_top_scorelines_for_output(raw_value: str, parsed_scores: list[str]) -> str:
    if raw_value:
        try:
            parsed = json.loads(raw_value)
            if isinstance(parsed, list):
                return json.dumps(parsed)
        except json.JSONDecodeError:
            pass
    return json.dumps(parsed_scores)


def prediction_type_breakdown(rows: list[dict[str, str]]) -> list[dict[str, object]]:
    output = []
    labels = [
        ("team_a_win", "Team A win"),
        ("draw", "Draw"),
        ("team_b_win", "Team B win"),
    ]
    for value, label in labels:
        bucket = [row for row in rows if row.get("predicted_result_label") == value]
        correct = count_true(bucket, "prediction_correct")
        output.append(
            {
                "type": value,
                "label": label,
                "matches": len(bucket),
                "correct": correct,
                "accuracy": correct / len(bucket) if bucket else None,
            }
        )
    return output


def accuracy_by_group(rows: list[dict[str, str]]) -> list[dict[str, object]]:
    groups = sorted({row.get("group", "") for row in rows if row.get("group", "")})
    output = []
    for group in groups:
        bucket = [row for row in rows if row.get("group") == group]
        correct = count_true(bucket, "prediction_correct")
        output.append(
            {
                "group": group,
                "matches": len(bucket),
                "correct": correct,
                "accuracy": correct / len(bucket) if bucket else None,
            }
        )
    return output


def empty_evaluation_row() -> dict[str, str]:
    return {field: "" for field in MATCH_EVALUATION_FIELDS}


def count_true(rows: list[dict[str, str]], field: str) -> int:
    return sum(1 for row in rows if row.get(field) == "true")


def average_float(rows: list[dict[str, str]], field: str) -> float | None:
    values = [float(row[field]) for row in rows if row.get(field) not in {"", None}]
    return sum(values) / len(values) if values else None


def calculate_log_loss(rows: list[dict[str, str]]) -> float:
    losses = []
    for row in rows:
        actual = row.get("actual_result_label")
        probability = {
            "team_a_win": float(row.get("p_team_a_win") or 0),
            "draw": float(row.get("p_draw") or 0),
            "team_b_win": float(row.get("p_team_b_win") or 0),
        }.get(actual, 0)
        losses.append(-safe_log(probability))
    return sum(losses) / len(losses)


def calculate_brier_score(rows: list[dict[str, str]]) -> float:
    total = 0.0
    for row in rows:
        actual = row.get("actual_result_label")
        for outcome, field in (
            ("team_a_win", "p_team_a_win"),
            ("draw", "p_draw"),
            ("team_b_win", "p_team_b_win"),
        ):
            target = 1.0 if actual == outcome else 0.0
            probability = float(row.get(field) or 0)
            total += (probability - target) ** 2
    return total / len(rows)


def safe_log(value: float) -> float:
    import math

    return math.log(max(min(value, 1 - 1e-15), 1e-15))


def confidence_buckets(rows: list[dict[str, str]]) -> list[dict[str, object]]:
    buckets = [
        ("0-45% very uncertain", 0, 0.45),
        ("45-60% moderate", 0.45, 0.6),
        ("60-75% strong", 0.6, 0.75),
        ("75%+ very strong", 0.75, 1.01),
    ]
    output = []
    for label, low, high in buckets:
        bucket_rows = []
        for row in rows:
            confidence = max(float(row.get("p_team_a_win") or 0), float(row.get("p_draw") or 0), float(row.get("p_team_b_win") or 0))
            if low <= confidence < high:
                bucket_rows.append(row)
        output.append(
            {
                "bucket": label,
                "matches": len(bucket_rows),
                "accuracy": count_true(bucket_rows, "prediction_correct") / len(bucket_rows) if bucket_rows else None,
            }
        )
    return output


if __name__ == "__main__":
    print(json.dumps(refresh_all_data(), indent=2))
