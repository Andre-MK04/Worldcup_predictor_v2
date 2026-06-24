import type { EvaluationPayload, MatchEvaluation, PerformanceSummary, Prediction } from "../types";

interface PerformanceProps {
  evaluation: EvaluationPayload | null;
  apiAvailable: boolean;
  predictions: Prediction[];
}

export function Performance({ evaluation, apiAvailable, predictions }: PerformanceProps) {
  const summary = evaluation?.summary;
  const matches = evaluation?.matches ?? [];
  const eligibleMatches = matches.filter((match) => match.eligible_for_evaluation === "true");
  const ineligibleMatches = matches.filter((match) => match.eligible_for_evaluation !== "true");

  return (
    <main className="model-page performance-page">
      <div className="page-kicker">Performance</div>
      <h2>Honest model evaluation</h2>
      <p className="page-intro">
        Completed matches count only when a prediction snapshot existed before kickoff. Matches without a pre-kickoff
        snapshot are shown as not eligible for evaluation. Current dashboard predictions are displayed as a reference,
        but they are not scored after kickoff.
      </p>
      {!apiAvailable ? (
        <section className="section-block">
          <div className="section-heading">
            <span>Backend unavailable</span>
            <strong>Static mode</strong>
          </div>
          <p className="empty-note">
            Set `VITE_API_BASE_URL` to your FastAPI backend to load live results, snapshots and performance metrics.
          </p>
        </section>
      ) : null}
      <PerformanceSummaryCards summary={summary} />
      <ConfidenceBuckets summary={summary} />
      <MatchEvaluationTable matches={eligibleMatches} predictions={predictions} title="Evaluated matches" />
      <MatchEvaluationTable matches={ineligibleMatches} predictions={predictions} title="Not eligible for evaluation" />
    </main>
  );
}

function PerformanceSummaryCards({ summary }: { summary?: PerformanceSummary }) {
  const cards = [
    ["Matches evaluated", summary?.evaluated_matches ?? 0],
    ["Result accuracy", formatPercent(summary?.result_accuracy)],
    ["Exact score", formatPercent(summary?.exact_scoreline_accuracy)],
    ["Top 5 score hit", formatPercent(summary?.top_5_scoreline_accuracy)],
    ["Total goals MAE", formatNumber(summary?.total_goals_mae)],
    ["Over 2.5 accuracy", formatPercent(summary?.over_2_5_accuracy)],
    ["Draw recall", formatPercent(summary?.draw_recall)],
    ["Not eligible", summary?.not_eligible_matches ?? 0],
  ];

  return (
    <section className="section-block">
      <div className="section-heading">
        <span>Snapshot-based metrics</span>
        <strong>{summary?.message ?? "Pre-kickoff snapshots only"}</strong>
      </div>
      <div className="metric-grid">
        {cards.map(([label, value]) => (
          <div className="metric-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function ConfidenceBuckets({ summary }: { summary?: PerformanceSummary }) {
  const buckets = summary?.confidence_buckets ?? [];
  if (!buckets.length) return null;
  return (
    <section className="section-block">
      <div className="section-heading">
        <span>Calibration by confidence</span>
        <strong>{buckets.reduce((sum, bucket) => sum + bucket.matches, 0)} matches</strong>
      </div>
      <div className="calibration-list">
        {buckets.map((bucket) => (
          <div className="calibration-row" key={bucket.bucket}>
            <span>{bucket.bucket}</span>
            <strong>{bucket.matches} matches</strong>
            <em>{formatPercent(bucket.accuracy)}</em>
          </div>
        ))}
      </div>
    </section>
  );
}

function MatchEvaluationTable({
  matches,
  predictions,
  title,
}: {
  matches: MatchEvaluation[];
  predictions: Prediction[];
  title: string;
}) {
  return (
    <section className="section-block">
      <div className="section-heading">
        <span>{title}</span>
        <strong>{matches.length}</strong>
      </div>
      {matches.length ? (
        <div className="evaluation-table">
          <div className="evaluation-row evaluation-head">
            <span>Match</span>
            <span>Actual</span>
            <span>Snapshot prediction</span>
            <span>Current prediction</span>
            <span>Result</span>
            <span>Top 5</span>
            <span>Snapshot</span>
          </div>
          {matches.map((match) => {
            const currentPrediction = findCurrentPrediction(match, predictions);
            return (
              <div className="evaluation-row" key={match.match_id}>
                <span>
                  <strong>
                    {match.team_a} vs {match.team_b}
                  </strong>
                  <small>{match.date}</small>
                </span>
                <span>{match.actual_score || "Unavailable"}</span>
                <span>{match.most_likely_single_scoreline || match.ineligibility_reason}</span>
                <span>
                  {currentPrediction ? (
                    <>
                      <strong>{currentPrediction.recommendedScore}</strong>
                      <small>{currentPrediction.predictedOutcome} · not scored</small>
                    </>
                  ) : (
                    "Unavailable"
                  )}
                </span>
                <span>{booleanLabel(match.prediction_correct)}</span>
                <span>{booleanLabel(match.actual_score_in_top_5)}</span>
                <span>{match.snapshot_used_at || "No pre-kickoff snapshot"}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="empty-note">No rows to show.</p>
      )}
    </section>
  );
}

function findCurrentPrediction(match: MatchEvaluation, predictions: Prediction[]) {
  return predictions.find((prediction) => {
    const sameOrder = prediction.teamA.name === match.team_a && prediction.teamB.name === match.team_b;
    const reverseOrder = prediction.teamA.name === match.team_b && prediction.teamB.name === match.team_a;
    return prediction.matchId === match.match_id || sameOrder || reverseOrder;
  });
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "N/A";
  return `${Math.round(value * 100)}%`;
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "N/A";
  return value.toFixed(2);
}

function booleanLabel(value: string) {
  if (value === "true") return "Yes";
  if (value === "false") return "No";
  return "N/A";
}
