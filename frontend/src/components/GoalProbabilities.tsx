import type { Prediction } from "../types";
import { percent } from "../utils";

interface GoalProbabilitiesProps {
  prediction: Prediction;
}

export function GoalProbabilities({ prediction }: GoalProbabilitiesProps) {
  const rows = [
    ["Over 1.5", prediction.goalProbabilities.over15],
    ["Over 2.5", prediction.goalProbabilities.over25],
    ["Over 3.5", prediction.goalProbabilities.over35],
    ["Both teams to score", prediction.goalProbabilities.bothTeamsToScore],
  ] as const;

  return (
    <section className="section-block goal-market-section">
      <div className="section-heading">
        <span>Goal markets</span>
        <strong>Poisson model</strong>
      </div>
      <div className="goal-meter-grid">
        {rows.map(([label, value]) => (
          <div className="goal-meter" key={label}>
            <div className="meter-ring" style={{ "--meter": `${value * 360}deg` } as React.CSSProperties}>
              <span>{percent(value)}</span>
            </div>
            <p>{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
