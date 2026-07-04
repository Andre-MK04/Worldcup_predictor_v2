import type { MatchEvaluation } from "../../types";

export function CorrectResultsList({ matches }: { matches: MatchEvaluation[] }) {
  return (
    <section className="section-block">
      <div className="section-heading">
        <span>Correct result predictions</span>
        <strong>{matches.length}</strong>
      </div>
      {matches.length ? (
        <div className="performance-card-list">
          {matches.map((match) => (
            <article className="performance-result-card" key={match.match_id}>
              <div>
                <strong>
                  {match.team_a} {match.actual_scoreline || match.actual_score} {match.team_b}
                </strong>
                <span>Prediction: {formatResultLabel(match.predicted_result_label, match)}</span>
              </div>
              <p>
                Probabilities: {match.team_a} {formatProbability(match.p_team_a_win)}, Draw {formatProbability(match.p_draw)},{" "}
                {match.team_b} {formatProbability(match.p_team_b_win)}
              </p>
              <span className="status-chip success">Result correct</span>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-note">No correct result predictions yet.</p>
      )}
    </section>
  );
}

function formatResultLabel(value: string, match: MatchEvaluation) {
  if (value === "team_a_win") return `${match.team_a} win`;
  if (value === "team_b_win") return `${match.team_b} win`;
  if (value === "draw") return "Draw";
  return "Unavailable";
}

function formatProbability(value: string) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "N/A";
  return `${Math.round(number * 100)}%`;
}
