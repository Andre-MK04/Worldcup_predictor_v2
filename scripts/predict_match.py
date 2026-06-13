from __future__ import annotations

import argparse
import json

import pandas as pd

from worldcup_predictor.data_loading import load_matches
from worldcup_predictor.feature_engineering import create_prediction_features
from worldcup_predictor.hybrid_predictor import HybridPredictor
from worldcup_predictor.xgboost_model import load_outcome_model


def main() -> None:
    parser = argparse.ArgumentParser(description="Predict one match with the hybrid model.")
    parser.add_argument("--history", default="data/matches.csv", help="Historical match CSV.")
    parser.add_argument("--model", default="models/hybrid_xgboost_model.joblib", help="Trained model path.")
    parser.add_argument("--team-a", required=True)
    parser.add_argument("--team-b", required=True)
    parser.add_argument("--date", required=True)
    parser.add_argument("--team-a-rating", type=float)
    parser.add_argument("--team-b-rating", type=float)
    parser.add_argument("--team-a-fifa-rank", type=float)
    parser.add_argument("--team-b-fifa-rank", type=float)
    parser.add_argument("--tournament", default="")
    parser.add_argument("--stage", default="")
    parser.add_argument("--neutral-venue", type=int, default=1)
    parser.add_argument("--host-team", default="")
    parser.add_argument("--xgboost-weight", type=float, default=0.6)
    parser.add_argument("--poisson-weight", type=float, default=0.4)
    args = parser.parse_args()

    history = load_matches(args.history)
    fixture = pd.DataFrame(
        [
            {
                "date": args.date,
                "team_a": args.team_a,
                "team_b": args.team_b,
                "team_a_rating": args.team_a_rating,
                "team_b_rating": args.team_b_rating,
                "team_a_fifa_rank": args.team_a_fifa_rank,
                "team_b_fifa_rank": args.team_b_fifa_rank,
                "tournament": args.tournament,
                "stage": args.stage,
                "neutral_venue": args.neutral_venue,
                "host_team": args.host_team,
            }
        ]
    )
    features = create_prediction_features(history, fixture)
    model = load_outcome_model(args.model)
    prediction = HybridPredictor(model, args.xgboost_weight, args.poisson_weight).predict_matches(features)[0]
    print(json.dumps(prediction, indent=2))


if __name__ == "__main__":
    main()
