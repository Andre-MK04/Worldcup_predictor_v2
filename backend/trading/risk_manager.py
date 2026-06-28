from __future__ import annotations

from datetime import datetime, timezone

from .config import TradingConfig, credentials_present, load_trading_config
from .trading_ledger import load_ledger


def approve_trade(candidate_trade: dict[str, object], config: TradingConfig | None = None) -> dict[str, object]:
    config = config or load_trading_config()
    ledger = load_ledger()
    checks: list[dict[str, object]] = []

    def check(name: str, passed: bool, detail: str) -> None:
        checks.append({"name": name, "passed": passed, "detail": detail})

    stake = to_float(candidate_trade.get("stake_usd") or candidate_trade.get("recommended_stake_usd"))
    match_id = str(candidate_trade.get("match_id", ""))
    edge = to_float(candidate_trade.get("edge"))
    model_probability = to_float(candidate_trade.get("model_probability"))
    price = to_float(candidate_trade.get("market_entry_price") or candidate_trade.get("limit_price"))
    liquidity = to_float(candidate_trade.get("liquidity"))
    spread = to_float(candidate_trade.get("spread"))
    outcome = str(candidate_trade.get("outcome", ""))

    check("ENABLE_REAL_TRADING is true", config.enable_real_trading, "Real trading defaults to disabled.")
    check("KILL_SWITCH is false", not config.kill_switch, "Kill switch defaults to on.")
    check("API credentials present", credentials_present(), "Polymarket secrets must exist only on the backend.")
    check("limit orders only", config.use_limit_orders_only, "Market orders are not allowed.")
    check("auto retry disabled", not config.auto_retry_orders, "Failed orders must not retry automatically.")
    check("stake per trade", stake > 0 and stake <= config.max_stake_per_trade_usd, f"Stake {stake:.2f} <= {config.max_stake_per_trade_usd:.2f}.")
    check("bankroll limit", total_staked(ledger) + stake <= config.real_bankroll_limit_usd, "Total staked cannot exceed bankroll cap.")
    check("daily stake limit", daily_stake(ledger) + stake <= config.max_daily_stake_usd, "Daily stake limit enforced.")
    check("open exposure limit", open_exposure(ledger) + stake <= config.max_total_open_exposure_usd, "Open exposure limit enforced.")
    check("per-match stake limit", match_stake(ledger, match_id) + stake <= config.max_stake_per_match_usd, "Per-match stake cap enforced.")
    check(
        "no existing trade on same match",
        config.allow_multiple_bets_per_match or match_stake(ledger, match_id) == 0,
        "Multiple bets per match disabled by default.",
    )
    check("market mapping approved", bool(candidate_trade.get("mapping_approved")), "Mapping must be user-approved with confidence >= 0.90.")
    check("match not started", not bool(candidate_trade.get("match_started")), "No post-kickoff trades.")
    check("market not live", config.allow_live_bets or not bool(candidate_trade.get("market_live")), "Live betting disabled by default.")
    check("World Cup 1X2 only", bool(candidate_trade.get("world_cup_match_outcome_only")), "Reject non-World-Cup or non-1X2 markets.")
    check("draw allowed", config.allow_draw_bets or outcome != "draw", "Draw bets are controlled by ALLOW_DRAW_BETS.")
    check("edge high enough", edge >= config.min_edge, f"Edge {edge:.3f} >= {config.min_edge:.3f}.")
    check("model probability high enough", model_probability >= config.min_model_probability, "Model probability threshold enforced.")
    check("liquidity high enough", liquidity >= config.min_market_liquidity_usd, "Liquidity threshold enforced.")
    check("spread acceptable", spread <= config.max_allowed_spread, "Spread threshold enforced.")
    check("price acceptable", price <= config.max_entry_price, "Entry price cap enforced.")
    check("prediction snapshot pre-kickoff", bool(candidate_trade.get("pre_kickoff_snapshot")), "No snapshot, no official execution.")
    check("no model warning", not bool(candidate_trade.get("model_warning")), "Model warning blocks trading.")

    approved = all(item["passed"] for item in checks)
    failed = [item["name"] for item in checks if not item["passed"]]
    return {
        "approved": approved,
        "reason": "approved" if approved else f"blocked: {', '.join(failed)}",
        "risk_checks": checks,
    }


def total_staked(rows: list[dict[str, str]]) -> float:
    return sum(to_float(row.get("stake_usd")) for row in rows)


def daily_stake(rows: list[dict[str, str]]) -> float:
    today = datetime.now(timezone.utc).date().isoformat()
    return sum(to_float(row.get("stake_usd")) for row in rows if str(row.get("created_at", "")).startswith(today))


def open_exposure(rows: list[dict[str, str]]) -> float:
    return sum(
        to_float(row.get("stake_usd"))
        for row in rows
        if row.get("status") in {"approved_by_risk", "submitted", "partially_filled", "filled"}
    )


def match_stake(rows: list[dict[str, str]], match_id: str) -> float:
    return sum(to_float(row.get("stake_usd")) for row in rows if row.get("match_id") == match_id)


def to_float(value: object) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0
