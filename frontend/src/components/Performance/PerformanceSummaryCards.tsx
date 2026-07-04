import type { PerformanceSummary } from "../../types";

interface PerformanceSummaryCardsProps {
  summary?: PerformanceSummary;
}

export function PerformanceSummaryCards({ summary }: PerformanceSummaryCardsProps) {
  const evaluated = summary?.evaluated_matches ?? 0;
  const cards = [
    { label: "Matches evaluated", value: evaluated },
    { label: "Correct results", value: `${summary?.correct_result_predictions ?? 0} / ${evaluated}` },
    { label: "Result accuracy", value: formatPercent(summary?.result_accuracy) },
    { label: "Exact scorelines", value: `${summary?.exact_scoreline_correct ?? 0} / ${evaluated}` },
    { label: "Exact accuracy", value: formatPercent(summary?.exact_scoreline_accuracy) },
    { label: "Top 5 hits", value: `${summary?.top_5_scoreline_hits ?? 0} / ${evaluated}` },
    { label: "Top 5 hit rate", value: formatPercent(summary?.top_5_scoreline_accuracy) },
    { label: "Not eligible", value: summary?.not_eligible_matches ?? 0 },
  ];

  return (
    <section className="section-block">
      <div className="section-heading">
        <span>Snapshot-based metrics</span>
        <strong>{summary?.message ?? "Pre-kickoff snapshots only"}</strong>
      </div>
      <div className="performance-summary-grid">
        {cards.map((card) => (
          <div className="metric-card performance-metric-card" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "N/A";
  return `${(value * 100).toFixed(1)}%`;
}
