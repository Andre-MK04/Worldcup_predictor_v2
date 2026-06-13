import type { CalibrationBucket, ModelMetric } from "../types";

interface ModelMetricsProps {
  metrics: ModelMetric[];
  calibration: CalibrationBucket[];
}

export function ModelMetrics({ metrics, calibration }: ModelMetricsProps) {
  return (
    <section className="model-section" id="backtesting">
      <div className="section-heading">
        <span>Backtesting</span>
        <strong>Chronological holdout</strong>
      </div>
      <div className="metrics-strip">
        {metrics.map((metric) => (
          <div className="metric-cell" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <em>{metric.trend}</em>
          </div>
        ))}
      </div>
      <div className="calibration-chart" id="model">
        {calibration.map((bucket) => (
          <div className="calibration-row" key={bucket.bucket}>
            <span>{bucket.bucket}</span>
            <div>
              <span className="confidence" style={{ width: `${bucket.confidence * 100}%` }} />
              <span className="accuracy" style={{ width: `${bucket.accuracy * 100}%` }} />
            </div>
            <strong>{Math.round(bucket.accuracy * 100)}%</strong>
          </div>
        ))}
      </div>
      <div className="legend-row">
        <span><i className="confidence-key" /> Avg confidence</span>
        <span><i className="accuracy-key" /> Actual accuracy</span>
      </div>
    </section>
  );
}
