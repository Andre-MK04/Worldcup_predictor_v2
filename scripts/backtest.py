from __future__ import annotations

import argparse
import json

from worldcup_predictor.data_loading import load_matches
from worldcup_predictor.evaluation import backtest_time_based, save_backtest_outputs


def main() -> None:
    parser = argparse.ArgumentParser(description="Run leakage-safe chronological backtesting.")
    parser.add_argument("--matches", default="data/matches.csv", help="Historical match CSV.")
    parser.add_argument("--test-size", type=float, default=0.2)
    parser.add_argument("--xgboost-weight", type=float, default=0.6)
    parser.add_argument("--poisson-weight", type=float, default=0.4)
    parser.add_argument("--output-dir", default="outputs")
    args = parser.parse_args()

    matches = load_matches(args.matches)
    metrics, predictions = backtest_time_based(
        matches,
        test_size=args.test_size,
        xgboost_weight=args.xgboost_weight,
        poisson_weight=args.poisson_weight,
    )
    save_backtest_outputs(metrics, predictions, args.output_dir)
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
