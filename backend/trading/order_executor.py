from __future__ import annotations

from datetime import datetime, timezone

from .order_builder import build_limit_order
from .risk_manager import approve_trade
from .trading_ledger import append_trade, load_recommendations


def execute_real_trade(trade_id: str, confirmation_text: str) -> dict[str, object]:
    if confirmation_text != "CONFIRM":
        return {"submitted": False, "reason": "confirmation text must be exactly CONFIRM"}

    recommendation = next((row for row in load_recommendations() if row.get("trade_id") == trade_id), None)
    if not recommendation:
        return {"submitted": False, "reason": "trade recommendation not found"}

    candidate = {**recommendation, "stake_usd": recommendation.get("recommended_stake_usd")}
    risk = approve_trade(candidate)
    if not risk["approved"]:
        return {"submitted": False, "reason": risk["reason"], "risk_checks": risk["risk_checks"]}

    order = build_limit_order(candidate)
    ledger_row = {
        "trade_id": trade_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "match_id": recommendation.get("match_id", ""),
        "team_a": recommendation.get("team_a", ""),
        "team_b": recommendation.get("team_b", ""),
        "market_id": recommendation.get("market_id", ""),
        "condition_id": recommendation.get("condition_id", ""),
        "token_id": recommendation.get("token_id", ""),
        "outcome": recommendation.get("outcome", ""),
        "country_or_draw": recommendation.get("country_or_draw", ""),
        "side": "BUY",
        "limit_price": order["limit_price"],
        "stake_usd": order["stake_usd"],
        "shares_requested": order["shares_requested"],
        "order_status": "not_submitted",
        "filled_shares": 0,
        "average_fill_price": "",
        "status": "approved_by_risk",
        "error_message": "SDK submission intentionally not enabled in this build; risk-approved order recorded only.",
    }
    append_trade(ledger_row)
    return {
        "submitted": False,
        "recorded": True,
        "reason": "Risk approved, but real Polymarket order submission is disabled in this safety-first build.",
        "order": ledger_row,
    }


def cancel_order(order_id: str) -> dict[str, object]:
    return {
        "cancelled": False,
        "reason": "No authenticated Polymarket cancel request is sent by this safety-first build.",
        "order_id": order_id,
    }
