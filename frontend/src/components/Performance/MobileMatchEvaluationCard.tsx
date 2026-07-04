import type { MatchEvaluation } from "../../types";

interface MobileMatchEvaluationCardProps {
  match: MatchEvaluation;
}

export function MobileMatchEvaluationCard({ match }: MobileMatchEvaluationCardProps) {
  const eligible = match.eligible_for_evaluation === "true";
  return (
    <article className={`evaluation-card ${match.exact_scoreline_correct === "true" ? "exact" : ""}`}>
      <div className="evaluation-card-title">
        <strong>
          {match.team_a} vs {match.team_b}
        </strong>
        <span className={eligible ? statusClass(match.prediction_correct) : "status-chip warning"}>
          {eligible ? (match.prediction_correct === "true" ? "Correct result" : "Incorrect result") : "Not eligible"}
        </span>
      </div>
      <dl>
        <div>
          <dt>Actual</dt>
          <dd>{match.actual_scoreline || match.actual_score || "Unavailable"}</dd>
        </div>
        <div>
          <dt>Predicted result</dt>
          <dd>{formatResultLabel(match.predicted_result_label)}</dd>
        </div>
        <div>
          <dt>Predicted score</dt>
          <dd>{match.most_likely_single_scoreline || "Unavailable"}</dd>
        </div>
        <div>
          <dt>Top 5</dt>
          <dd>{match.actual_score_in_top_5 === "true" ? "Hit" : eligible ? "Miss" : "N/A"}</dd>
        </div>
      </dl>
      <small>{eligible ? match.confidence_label || "No confidence label" : match.ineligibility_reason}</small>
    </article>
  );
}

function statusClass(value: string) {
  return value === "true" ? "status-chip success" : "status-chip muted";
}

function formatResultLabel(value: string) {
  if (value === "team_a_win") return "Team A win";
  if (value === "team_b_win") return "Team B win";
  if (value === "draw") return "Draw";
  return "Unavailable";
}
