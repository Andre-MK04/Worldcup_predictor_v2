import type { CalibrationBucket, ModelMetric } from "../types";
import { ModelMetrics } from "./ModelMetrics";

interface ModelViewProps {
  metrics: ModelMetric[];
  calibration: CalibrationBucket[];
  mode: "model" | "backtesting";
}

export function ModelView({ metrics, calibration, mode }: ModelViewProps) {
  return (
    <main className="model-page">
      <div className="page-kicker">{mode === "model" ? "Model" : "Backtesting"}</div>
      <h2>{mode === "model" ? "Hybrid prediction stack" : "Chronological model evaluation"}</h2>
      <p className="page-intro">
        The dashboard combines outcome probabilities with a Poisson score model. Backtesting uses future-only
        chronological splits so completed future matches do not leak into earlier predictions.
      </p>
      <ModelMetrics metrics={metrics} calibration={calibration} />
    </main>
  );
}
