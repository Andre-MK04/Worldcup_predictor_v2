from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.data_sources.data_refresh import evaluate_match, latest_pre_kickoff_snapshot


fixture = {
    "match_id": "MEX-RSA-2026-06-11",
    "date": "2026-06-11",
    "kickoff_time": "12:00",
    "team_a": "Mexico",
    "team_b": "South Africa",
}

result = {
    "match_id": "MEX-RSA-2026-06-11",
    "date": "2026-06-11",
    "team_a": "Mexico",
    "team_b": "South Africa",
    "status": "complete",
    "team_a_goals": "2",
    "team_b_goals": "0",
    "result_label": "team_a_win",
}

pre_kickoff_snapshot = {
    "match_id": "MEX-RSA-2026-06-11",
    "generated_at": "2026-06-11T10:00:00+00:00",
    "team_a": "Mexico",
    "team_b": "South Africa",
    "p_team_a_win_final": "0.55",
    "p_draw_final": "0.25",
    "p_team_b_win_final": "0.20",
    "predicted_winner_country": "Mexico",
    "predicted_result_label": "team_a_win",
    "expected_goals_team_a": "1.8",
    "expected_goals_team_b": "0.7",
    "expected_total_goals": "2.5",
    "most_likely_single_scoreline": "2-0",
    "top_5_scorelines": "2-0|1-0|2-1|3-0|1-1",
    "p_over_2_5_goals": "0.48",
    "p_both_teams_to_score": "0.34",
    "confidence_label": "moderate",
}

post_kickoff_snapshot = {
    **pre_kickoff_snapshot,
    "generated_at": "2026-06-11T13:00:00+00:00",
    "most_likely_single_scoreline": "9-0",
}

selected = latest_pre_kickoff_snapshot([post_kickoff_snapshot, pre_kickoff_snapshot], fixture)
assert selected == pre_kickoff_snapshot

eligible_row = evaluate_match(result, fixture, selected)
assert eligible_row["eligible_for_evaluation"] == "true"
assert eligible_row["exact_scoreline_correct"] == "true"
assert eligible_row["snapshot_used_at"] == "2026-06-11T10:00:00+00:00"

ineligible_row = evaluate_match(result, fixture, None)
assert ineligible_row["eligible_for_evaluation"] == "false"
assert "no pre-kickoff prediction snapshot" in ineligible_row["ineligibility_reason"]

print("evaluation honesty tests passed")
