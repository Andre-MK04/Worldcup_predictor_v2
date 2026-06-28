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

## Live Data Refresh and Evaluation

The app now separates schedule, results, predictions, prediction snapshots,
standings and evaluation data.

Processed files live in `data/processed/`:

- `fixtures.csv`: official match schedule
- `results.csv`: completed/live match results
- `predictions.csv`: latest generated predictions, if exported
- `prediction_snapshots.csv`: historical prediction snapshots
- `live_group_standings.csv`: standings calculated from completed results only

Evaluation outputs live in `outputs/`:

- `data_refresh_report.json`
- `model_performance_summary.json`
- `match_evaluation.csv`

Run a refresh locally:

```bash
python3 -m src.data_sources.data_refresh
```

Run the API backend:

```bash
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

Then point the dashboard at the backend:

```bash
cd frontend
VITE_API_BASE_URL=http://localhost:8000 npm run dev
```

Optional environment variables:

- `VITE_API_BASE_URL`: frontend API base URL
- `FOOTBALL_API_PROVIDER`: `local_csv`, `fifa`, or `api_football`
- `FOOTBALL_API_KEY`: optional provider key
- `VITE_DATA_REFRESH_INTERVAL_MINUTES`: frontend polling interval, default `15`
- `USE_CURRENT_TOURNAMENT_RESULTS_AS_FORM`: future model hook, default intended `true`
- `RETRAIN_WITH_CURRENT_TOURNAMENT_RESULTS`: future model hook, default intended `false`

No paid API is required. If no API provider is configured, put manual imports in:

- `data/imports/fixtures.csv`
- `data/imports/results.csv`

Refresh will fall back to those files, then to the bundled official group-stage
schedule if no fixture CSV exists. It will not invent results.

Prediction snapshots are required for honest accuracy reporting. For each
completed match, evaluation uses the latest snapshot generated before kickoff.
If no pre-kickoff snapshot exists, the match is shown as “not eligible for
evaluation” and does not count in accuracy, log loss, Brier score, exact-score
rate, over/under accuracy, or any other official performance metric.

## Real-Money Trading Safety

The app includes a locked-down Polymarket trading scaffold for World Cup 1X2
match markets only. It is not financial advice, and prediction markets can lose
the full amount staked.

Defaults are intentionally blocking:

- `ENABLE_REAL_TRADING=false`
- `KILL_SWITCH=true`
- `REAL_BANKROLL_LIMIT_USD=10.00`
- `MAX_STAKE_PER_TRADE_USD=0.50`
- `MAX_STAKE_PER_MATCH_USD=1.00`
- `MAX_DAILY_STAKE_USD=3.00`
- `MAX_TOTAL_OPEN_EXPOSURE_USD=5.00`
- `USE_LIMIT_ORDERS_ONLY=true`
- `AUTO_RETRY_ORDERS=false`

Authenticated Polymarket secrets must exist only on the backend. Use
`.env.example` as a template and never commit real values. Market mappings must
be manually reviewed and approved in `data/processed/polymarket_market_mapping.csv`
before any trade can even be considered.

The Trading page can display safety config, recommendations, the ledger and
performance. The execution endpoint requires an explicit `CONFIRM` text and runs
risk checks again immediately before execution. In the current safety-first
build, SDK order submission is not enabled; a risk-approved request is recorded
instead of sending a real order.

## Notes

Install `xgboost` for the requested XGBoost model. If it is not installed, training still runs with the fallback classifier and reports `sklearn_hist_gradient_boosting_fallback` as the model type.

The recommended scoreline is derived from the same Poisson matrix as the goal probabilities, then filtered to match the final blended outcome. The true top 5 scorelines are still shown separately.
