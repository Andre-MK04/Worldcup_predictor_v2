import type { Prediction, TeamPrediction } from "../types";
import { percent } from "../utils";

interface TeamFormComparisonProps {
  prediction: Prediction;
}

export function TeamFormComparison({ prediction }: TeamFormComparisonProps) {
  const rows = [
    {
      label: "Last 5 form",
      teamA: <FormDots team={prediction.teamA} />,
      teamB: <FormDots team={prediction.teamB} />,
      detail: "Recent result sequence",
    },
    {
      label: "Goals scored last 10",
      teamA: prediction.teamA.goalsScoredLast10,
      teamB: prediction.teamB.goalsScoredLast10,
      detail: "Raw goals, not per match",
    },
    {
      label: "Goals conceded last 10",
      teamA: prediction.teamA.goalsConcededLast10,
      teamB: prediction.teamB.goalsConcededLast10,
      detail: "Lower is stronger",
    },
    {
      label: "xG last 10",
      teamA: prediction.teamA.xgLast10.toFixed(2),
      teamB: prediction.teamB.xgLast10.toFixed(2),
      detail: "Average expected goals for",
    },
    {
      label: "xG against last 10",
      teamA: prediction.teamA.xgAgainstLast10.toFixed(2),
      teamB: prediction.teamB.xgAgainstLast10.toFixed(2),
      detail: "Average expected goals against",
    },
    {
      label: "Clean sheet rate",
      teamA: percent(prediction.teamA.cleanSheetRate),
      teamB: percent(prediction.teamB.cleanSheetRate),
      detail: "Last 10 matches",
    },
    {
      label: "Failed to score rate",
      teamA: percent(prediction.teamA.failedToScoreRate),
      teamB: percent(prediction.teamB.failedToScoreRate),
      detail: "Last 10 matches",
    },
  ];

  return (
    <section className="team-form-section">
      <div className="section-heading">
        <span>Team form comparison</span>
        <strong>
          {prediction.teamA.code} / {prediction.teamB.code}
        </strong>
      </div>
      <div className="comparison-table">
        <div className="comparison-header">
          <span>Metric</span>
          <strong>{prediction.teamA.code}</strong>
          <strong>{prediction.teamB.code}</strong>
        </div>
        {rows.map((row) => (
          <div className="comparison-row" key={row.label} title={row.detail}>
            <span>{row.label}</span>
            <strong>{row.teamA}</strong>
            <strong>{row.teamB}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function FormDots({ team }: { team: TeamPrediction }) {
  return (
    <span className="form-dots" aria-label={`${team.name} form ${team.form.join(" ")}`}>
      {team.form.map((result, index) => (
        <span className={`form-dot ${result.toLowerCase()}`} key={`${team.code}-${index}`}>
          {result}
        </span>
      ))}
    </span>
  );
}
