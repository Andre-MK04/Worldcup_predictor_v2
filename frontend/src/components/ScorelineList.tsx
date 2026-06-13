import type { Prediction } from "../types";
import { percent } from "../utils";

interface ScorelineListProps {
  prediction: Prediction;
}

export function ScorelineList({ prediction }: ScorelineListProps) {
  const max = Math.max(...prediction.topScorelines.map((row) => row.probability));
  return (
    <section className="section-block scoreline-section">
      <div className="section-heading">
        <span>Raw exact scorelines</span>
        <strong>Top 5 by single-score probability</strong>
      </div>
      <ol className="scoreline-list">
        {prediction.topScorelines.map((row, index) => (
          <li key={row.score} title={`${row.score} has ${percent(row.probability)} probability`}>
            <span className="rank">{String(index + 1).padStart(2, "0")}</span>
            <strong>{row.score}</strong>
            <span className="mini-track">
              <span style={{ width: `${(row.probability / max) * 100}%` }} />
            </span>
            <em>{percent(row.probability)}</em>
          </li>
        ))}
      </ol>
    </section>
  );
}
