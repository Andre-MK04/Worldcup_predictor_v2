import type { Prediction } from "../types";
import { percent } from "../utils";

interface ProbabilityBarProps {
  prediction: Prediction;
}

export function ProbabilityBar({ prediction }: ProbabilityBarProps) {
  const segments = [
    {
      label: `${prediction.teamA.name} win`,
      value: prediction.probabilities.teamAWin,
      className: "team-a",
    },
    { label: "Draw", value: prediction.probabilities.draw, className: "draw" },
    {
      label: `${prediction.teamB.name} win`,
      value: prediction.probabilities.teamBWin,
      className: "team-b",
    },
  ];

  return (
    <section className="section-block probability-section">
      <div className="section-heading">
        <span>Three-way probability</span>
        <strong>Most likely overall outcome: {prediction.overallOutcomeLabel}</strong>
      </div>
      {prediction.knockout ? <span className="knockout-badge">Round of 32 · Knockout</span> : null}
      <div className="segmented-bar" aria-label="Three-way match probability">
        {segments.map((segment) => (
          <span
            className={`bar-segment ${segment.className}`}
            key={segment.label}
            style={{ width: `${segment.value * 100}%` }}
            title={`${segment.label}: ${percent(segment.value)}`}
          />
        ))}
      </div>
      <div className="probability-labels">
        {segments.map((segment) => (
          <div key={segment.label}>
            <span>{segment.label}</span>
            <strong>{percent(segment.value)}</strong>
          </div>
        ))}
      </div>
      {prediction.knockout ? (
        <div className="advance-probabilities" aria-label="Knockout advancement probability">
          <div className={prediction.knockout.predictedToAdvanceCode === prediction.teamA.code ? "advancer" : undefined}>
            <span>{prediction.teamA.name} advance</span>
            <strong>{percent(prediction.knockout.teamAAdvanceProbability)}</strong>
          </div>
          <div className={prediction.knockout.predictedToAdvanceCode === prediction.teamB.code ? "advancer" : undefined}>
            <span>{prediction.teamB.name} advance</span>
            <strong>{percent(prediction.knockout.teamBAdvanceProbability)}</strong>
          </div>
        </div>
      ) : null}
      {prediction.overallOutcome !== prediction.scoreOutcome ? (
        <p className="probability-note">
          Exact-score prediction is {prediction.recommendedScore} ({prediction.predictedOutcome}), but summed scoreline
          probabilities make {prediction.overallOutcomeLabel} the most likely overall outcome.
        </p>
      ) : null}
      {prediction.knockout ? <p className="probability-note">{prediction.knockout.note}</p> : null}
    </section>
  );
}
