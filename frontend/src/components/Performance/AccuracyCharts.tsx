import type { PerformanceSummary } from "../../types";

interface AccuracyChartsProps {
  summary?: PerformanceSummary;
}

export function AccuracyCharts({ summary }: AccuracyChartsProps) {
  const evaluated = summary?.evaluated_matches ?? 0;
  const correct = summary?.correct_result_predictions ?? 0;
  const exact = summary?.exact_scoreline_correct ?? 0;
  const top5 = summary?.top_5_scoreline_hits ?? 0;
  const top5Only = Math.max(0, top5 - exact);
  const misses = Math.max(0, evaluated - top5);

  return (
    <section className="section-block">
      <div className="section-heading">
        <span>Accuracy charts</span>
        <strong>{evaluated ? `${evaluated} evaluated matches` : "Waiting for eligible snapshots"}</strong>
      </div>
      <div className="performance-chart-grid">
        <ChartBlock
          title="Result prediction"
          rows={[
            { label: "Correct", value: correct, total: evaluated, tone: "success" },
            { label: "Incorrect", value: Math.max(0, evaluated - correct), total: evaluated, tone: "muted" },
          ]}
        />
        <ChartBlock
          title="Scoreline prediction"
          rows={[
            { label: "Exact hits", value: exact, total: evaluated, tone: "gold" },
            { label: "Top 5 only", value: top5Only, total: evaluated, tone: "success" },
            { label: "Misses", value: misses, total: evaluated, tone: "muted" },
          ]}
        />
        <ChartBlock
          title="Prediction type breakdown"
          rows={(summary?.prediction_type_breakdown ?? []).map((row) => ({
            label: row.label,
            value: row.correct,
            total: row.matches,
            tone: row.type === "draw" ? "gold" : "success",
            detail: `${row.correct} / ${row.matches}`,
          }))}
        />
      </div>
    </section>
  );
}

function ChartBlock({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: number; total: number; tone: string; detail?: string }>;
}) {
  return (
    <div className="performance-chart">
      <h3>{title}</h3>
      <div className="chart-bars">
        {rows.length ? (
          rows.map((row) => <ChartBar key={row.label} {...row} />)
        ) : (
          <p className="empty-note">No eligible rows yet.</p>
        )}
      </div>
    </div>
  );
}

function ChartBar({
  label,
  value,
  total,
  tone,
  detail,
}: {
  label: string;
  value: number;
  total: number;
  tone: string;
  detail?: string;
}) {
  const width = total > 0 ? Math.max(4, (value / total) * 100) : 0;
  return (
    <div className="chart-bar-row">
      <div>
        <span>{label}</span>
        <strong>{detail ?? `${value}`}</strong>
      </div>
      <div className="chart-track" aria-label={`${label}: ${value} of ${total}`}>
        <span className={`chart-fill ${tone}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
