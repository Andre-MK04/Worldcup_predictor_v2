import type { MatchEvaluation } from "../../types";

export function CorrectScorelinesList({ matches }: { matches: MatchEvaluation[] }) {
  return (
    <section className="section-block">
      <div className="section-heading">
        <span>Correct exact scorelines</span>
        <strong>{matches.length}</strong>
      </div>
      {matches.length ? (
        <div className="performance-card-list">
          {matches.map((match) => (
            <article className="performance-result-card exact" key={match.match_id}>
              <div>
                <strong>
                  {match.team_a} {match.actual_scoreline || match.actual_score} {match.team_b}
                </strong>
                <span>Predicted exact scoreline: {match.most_likely_single_scoreline}</span>
              </div>
              <p>Top 5 scorelines: {formatTopScorelines(match.top_5_scorelines)}</p>
              <span className="status-chip gold">Exact scoreline</span>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-note">No exact scoreline hits yet.</p>
      )}
    </section>
  );
}

function formatTopScorelines(value: string) {
  if (!value) return "Unavailable";
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object" && "score" in item) return String(item.score);
          return String(item);
        })
        .slice(0, 5)
        .join(", ");
    }
  } catch {
    return value;
  }
  return value;
}
