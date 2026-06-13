from __future__ import annotations

import argparse
import json

from worldcup_predictor.training import train_from_csv


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the hybrid predictor outcome model.")
    parser.add_argument("--matches", default="data/matches.csv", help="Path to historical match CSV.")
    parser.add_argument("--model", default="models/hybrid_xgboost_model.joblib", help="Output model path.")
    args = parser.parse_args()

    model, features = train_from_csv(args.matches, args.model)
    print(json.dumps({"model_type": model.model_type, "metrics": model.metrics, "feature_rows": len(features)}, indent=2))


if __name__ == "__main__":
    main()
