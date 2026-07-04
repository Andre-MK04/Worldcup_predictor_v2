import type { PerformanceSummary } from "../../types";

export function ConfidenceAccuracyChart({ summary }: { summary?: PerformanceSummary }) {
  const buckets = summary?.confidence_buckets ?? [];
  return (
    <section className="section-block">
      <div className="section-heading">
        <span>Accuracy by confidence</span>
        <strong>{buckets.reduce((sum, bucket) => sum + bucket.matches, 0)} matches</strong>
      </div>
      <div className="performance-chart wide">
        {buckets.length ? (
          buckets.map((bucket) => (
            <div className="chart-bar-row" key={bucket.bucket}>
              <div>
                <span>{bucket.bucket}</span>
                <strong>{bucket.matches} matches</strong>
              </div>
              <div className="chart-track">
                <span className="chart-fill success" style={{ width: `${bucket.accuracy ? bucket.accuracy * 100 : 0}%` }} />
              </div>
              <em>{formatPercent(bucket.accuracy)}</em>
            </div>
          ))
        ) : (
          <p className="empty-note">No confidence buckets yet.</p>
        )}
      </div>
    </section>
  );
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "N/A";
  return `${(value * 100).toFixed(1)}%`;
}
