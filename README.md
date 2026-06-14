# World Cup Predictor v2

Hybrid international football prediction system:

- 3-class outcome model: team A win, draw, team B win.
- XGBoost when installed, with a scikit-learn gradient boosting fallback.
- Poisson goal model for expected goals, scorelines, over/under, and BTTS.
- Blended final probabilities with configurable XGBoost and Poisson weights.
- Time-based backtesting to avoid future-data leakage.

## Data

Put historical international matches in `data/matches.csv`.

Required columns:

- `date`
- `team_a`
- `team_b`
- `team_a_score`
- `team_b_score`

Useful optional columns:

- `team_a_xg`, `team_b_xg`
- `team_a_rating`, `team_b_rating`
- `team_a_fifa_rank`, `team_b_fifa_rank`
- `tournament`, `stage`, `round`
- `neutral_venue`, `host_team`
- `rest_days_team_a`, `rest_days_team_b`
- `match_importance`

Common aliases like `home_team`, `away_team`, `home_score`, `away_score`, `home_xg`, and `away_xg` are normalized automatically.

If xG columns are missing, feature engineering falls back to goals scored and conceded while still creating xG feature columns for future data.

## Train

```bash
python3 scripts/train_model.py --matches data/matches.csv --model models/hybrid_xgboost_model.joblib
```

This writes:

- `models/hybrid_xgboost_model.joblib`
- `outputs/model_metrics.json`
- `outputs/training_features.csv`

## Predict One Match

```bash
python3 scripts/predict_match.py \
  --history data/matches.csv \
  --model models/hybrid_xgboost_model.joblib \
  --team-a Mexico \
  --team-b "South Africa" \
  --date 2026-06-11 \
  --team-a-rating 1700 \
  --team-b-rating 1450 \
  --team-a-fifa-rank 15 \
  --team-b-fifa-rank 55 \
  --tournament "FIFA World Cup" \
  --stage "Group"
```

The prediction is a structured JSON object with expected goals, XGBoost probabilities, Poisson probabilities, final blended probabilities, top scorelines, an outcome-consistent recommended score, and a short explanation.

## Backtest

```bash
python3 scripts/backtest.py --matches data/matches.csv --test-size 0.2
```

This writes:

- `outputs/backtest_predictions.csv`
- `outputs/backtest_metrics.json`

Metrics include 1X2 accuracy, draw accuracy, favorite accuracy, exact score accuracy, over/under 2.5 accuracy, Brier score, log loss, and calibration buckets.

## Deploy Dashboard on Vercel

The deployable web app is the Vite dashboard in `frontend/`. The Python package in
the repo root is model/training code and is not a Vercel Python function.

This repo includes `vercel.json` so Vercel builds the dashboard with:

- Install command: `cd frontend && npm ci`
- Build command: `cd frontend && npm run build`
- Output directory: `frontend/dist`

If the Vercel project settings were created before this config, make sure the
Framework Preset is Vite and the Root Directory is the repository root, or set
the Root Directory to `frontend` and use Vercel's default Vite settings.

## Notes

Install `xgboost` for the requested XGBoost model. If it is not installed, training still runs with the fallback classifier and reports `sklearn_hist_gradient_boosting_fallback` as the model type.

The recommended scoreline is derived from the same Poisson matrix as the goal probabilities, then filtered to match the final blended outcome. The true top 5 scorelines are still shown separately.
