import type { PerformanceSummary } from "../../types";

export function AccuracyByGroupChart({ summary }: { summary?: PerformanceSummary }) {
  const groups = summary?.accuracy_by_group ?? [];
  return (
    <section className="section-block">
      <div className="section-heading">
        <span>Accuracy by group</span>
        <strong>{groups.length ? `${groups.length} groups` : "No eligible group results yet"}</strong>
      </div>
      <div className="performance-chart wide">
        {groups.length ? (
          groups.map((group) => (
            <div className="chart-bar-row" key={group.group}>
              <div>
                <span>Group {group.group}</span>
                <strong>
                  {group.correct} / {group.matches}
                </strong>
              </div>
              <div className="chart-track">
                <span className="chart-fill gold" style={{ width: `${group.accuracy ? group.accuracy * 100 : 0}%` }} />
              </div>
              <em>{formatPercent(group.accuracy)}</em>
            </div>
          ))
        ) : (
          <p className="empty-note">No group accuracy to show yet.</p>
        )}
      </div>
    </section>
  );
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "N/A";
  return `${(value * 100).toFixed(1)}%`;
}
