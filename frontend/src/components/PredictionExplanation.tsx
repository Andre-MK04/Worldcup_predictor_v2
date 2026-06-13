import type { Prediction } from "../types";

interface PredictionExplanationProps {
  prediction: Prediction;
}

export function PredictionExplanation({ prediction }: PredictionExplanationProps) {
  return (
    <section className="analysis-section">
      <span>Model explanation</span>
      <p>{prediction.explanation}</p>
    </section>
  );
}
