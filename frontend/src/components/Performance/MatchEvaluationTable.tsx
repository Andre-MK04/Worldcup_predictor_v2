import type { MatchEvaluation } from "../../types";
import { MobileMatchEvaluationCard } from "./MobileMatchEvaluationCard";

export function MatchEvaluationTable({ matches }: { matches: MatchEvaluation[] }) {
  return (
    <section className="section-block">
      <div className="section-heading">
        <span>All evaluated matches</span>
        <strong>{matches.length}</strong>
      </div>
      {matches.length ? (
        <>
          <div className="evaluation-table performance-evaluation-table">
            <div className="evaluation-row evaluation-head">
              <span>Match</span>
              <span>Actual</span>
              <span>Predicted result</span>
              <span>Predicted score</span>
              <span>Result</span>
              <span>Exact</span>
              <span>Top 5</span>
              <span>Confidence</span>
            </div>
            {matches.map((match) => (
              <div className="evaluation-row" key={match.match_id}>
                <span>
                  <strong>
                    {match.team_a} vs {match.team_b}
                  </strong>
                  <small>{match.date}</small>
                </span>
                <span>{match.actual_scoreline || match.actual_score || "Unavailable"}</span>
                <span>{formatResultLabel(match.predicted_result_label)}</span>
                <span>{match.most_likely_single_scoreline || "Unavailable"}</span>
                <span className={statusClass(match.prediction_correct)}>{resultStatus(match)}</span>
                <span className={match.exact_scoreline_correct === "true" ? "status-chip gold" : "status-chip muted"}>
                  {match.exact_scoreline_correct === "true" ? "Exact" : "No"}
                </span>
                <span className={match.actual_score_in_top_5 === "true" ? "status-chip success" : "status-chip muted"}>
                  {match.actual_score_in_top_5 === "true" ? "Hit" : "Miss"}
                </span>
                <span>{match.confidence_label || "N/A"}</span>
              </div>
            ))}
          </div>
          <div className="evaluation-card-list">
            {matches.map((match) => (
              <MobileMatchEvaluationCard key={match.match_id} match={match} />
            ))}
          </div>
        </>
      ) : (
        <p className="empty-note">No evaluated matches to show.</p>
      )}
    </section>
  );
}

function formatResultLabel(value: string) {
  if (value === "team_a_win") return "Team A win";
  if (value === "team_b_win") return "Team B win";
  if (value === "draw") return "Draw";
  return "Unavailable";
}

function resultStatus(match: MatchEvaluation) {
  if (match.eligible_for_evaluation !== "true") return "Not eligible";
  return match.prediction_correct === "true" ? "Correct" : "Wrong";
}

function statusClass(value: string) {
  return value === "true" ? "status-chip success" : "status-chip muted";
}
