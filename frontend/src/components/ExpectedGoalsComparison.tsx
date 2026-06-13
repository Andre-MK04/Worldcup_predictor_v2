import type { Prediction } from "../types";

interface ExpectedGoalsComparisonProps {
  prediction: Prediction;
}

export function ExpectedGoalsComparison({ prediction }: ExpectedGoalsComparisonProps) {
  const max = Math.max(prediction.teamA.expectedGoals, prediction.teamB.expectedGoals, 2);
  return (
    <section className="section-block xg-section">
      <div className="section-heading">
        <span>Expected goals</span>
        <strong>{(prediction.teamA.expectedGoals + prediction.teamB.expectedGoals).toFixed(2)} total</strong>
      </div>
      <XgRow name={prediction.teamA.name} code={prediction.teamA.code} value={prediction.teamA.expectedGoals} max={max} />
      <XgRow name={prediction.teamB.name} code={prediction.teamB.code} value={prediction.teamB.expectedGoals} max={max} />
    </section>
  );
}

function XgRow({ name, code, value, max }: { name: string; code: string; value: number; max: number }) {
  return (
    <div className="xg-row">
      <div>
        <span>{code}</span>
        <strong>{name}</strong>
      </div>
      <div className="xg-track">
        <span style={{ width: `${Math.min((value / max) * 100, 100)}%` }} />
      </div>
      <em>{value.toFixed(2)}</em>
    </div>
  );
}
