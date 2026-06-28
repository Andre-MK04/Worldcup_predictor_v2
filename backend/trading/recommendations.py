from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from .config import load_trading_config
from .edge_calculator import calculate_edge
from .io import read_csv
from .market_mapping import approved_mapping_for_match, ensure_market_mapping_file
from .price_fetcher import fetch_outcome_price
from .risk_manager import approve_trade
from .stake_sizing import recommend_stake
from .trading_ledger import save_recommendations


PREDICTIONS_PATH = Path("data/processed/predictions.csv")


def generate_recommendations() -> dict[str, object]:
    ensure_market_mapping_file()
    config = load_trading_config()
    predictions = read_csv(PREDICTIONS_PATH)
    rows: list[dict[str, object]] = []

    for prediction in predictions:
        match_id = prediction.get("match_id", "")
        mapping = approved_mapping_for_match(match_id)
        if not mapping:
            continue
        candidates = outcome_candidates(prediction, mapping)
        approved_candidates = []
        for candidate in candidates:
            price = fetch_outcome_price(str(candidate["token_id"]))
            if price["best_ask"] is None:
                continue
            edge_data = calculate_edge(float(candidate["model_probability"]), float(price["best_ask"]))
            stake_data = recommend_stake(edge_data["edge"], edge_data["model_probability"], config.real_bankroll_limit_usd, config)
            trade = {
                "trade_id": str(uuid.uuid4()),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "match_id": match_id,
                "team_a": prediction.get("team_a", ""),
                "team_b": prediction.get("team_b", ""),
                "market_id": mapping.get("polymarket_market_id", ""),
                "condition_id": mapping.get("condition_id", ""),
                "token_id": candidate["token_id"],
                "outcome": candidate["outcome"],
                "country_or_draw": candidate["country_or_draw"],
                "model_probability": edge_data["model_probability"],
                "market_entry_price": edge_data["market_entry_price"],
                "edge": edge_data["edge"],
                "expected_value": edge_data["expected_value"],
                "spread": price.get("spread") if price.get("spread") is not None else 999,
                "liquidity": price.get("liquidity", 0),
                "recommended_stake_usd": stake_data["recommended_stake_usd"],
                "stake_reason": stake_data["stake_reason"],
                "mapping_approved": True,
                "match_started": False,
                "market_live": False,
                "world_cup_match_outcome_only": True,
                "pre_kickoff_snapshot": False,
                "model_warning": False,
            }
            risk = approve_trade(trade, config)
            trade.update(
                {
                    "approved_by_risk": risk["approved"],
                    "risk_reason": risk["reason"],
                    "risk_checks": json.dumps(risk["risk_checks"]),
                    "status": "candidate",
                }
            )
            approved_candidates.append(trade)
        if approved_candidates:
            approved_candidates.sort(key=lambda item: float(item["edge"]), reverse=True)
            rows.append(approved_candidates[0])

    save_recommendations(rows)
    return {"recommendations": rows, "count": len(rows)}


def outcome_candidates(prediction: dict[str, str], mapping: dict[str, str]) -> list[dict[str, object]]:
    return [
        {
            "outcome": "team_a_win",
            "country_or_draw": prediction.get("team_a", ""),
            "model_probability": float(prediction.get("p_team_a_win_final") or 0),
            "token_id": mapping.get("token_id_team_a_win", ""),
        },
        {
            "outcome": "draw",
            "country_or_draw": "Draw",
            "model_probability": float(prediction.get("p_draw_final") or 0),
            "token_id": mapping.get("token_id_draw", ""),
        },
        {
            "outcome": "team_b_win",
            "country_or_draw": prediction.get("team_b", ""),
            "model_probability": float(prediction.get("p_team_b_win_final") or 0),
            "token_id": mapping.get("token_id_team_b_win", ""),
        },
    ]
