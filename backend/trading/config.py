from __future__ import annotations

import json
import os
from dataclasses import asdict, dataclass
from pathlib import Path


RUNTIME_STATE_PATH = Path("data/processed/trading_runtime_state.json")


@dataclass(frozen=True)
class TradingConfig:
    trading_mode: str = "real_capped"
    enable_real_trading: bool = False
    real_bankroll_limit_usd: float = 10.0
    max_stake_per_trade_usd: float = 0.5
    max_stake_per_match_usd: float = 1.0
    max_daily_stake_usd: float = 3.0
    max_total_open_exposure_usd: float = 5.0
    min_edge: float = 0.08
    min_model_probability: float = 0.40
    max_entry_price: float = 0.85
    min_market_liquidity_usd: float = 100.0
    max_allowed_spread: float = 0.08
    allow_draw_bets: bool = True
    allow_live_bets: bool = False
    allow_multiple_bets_per_match: bool = False
    use_limit_orders_only: bool = True
    auto_retry_orders: bool = False
    kill_switch: bool = True
    polymarket_api_base_url: str = "https://clob.polymarket.com"


def load_trading_config() -> TradingConfig:
    runtime_state = load_runtime_state()
    env_kill_switch = env_bool("KILL_SWITCH", True)
    kill_switch = bool(runtime_state.get("kill_switch", env_kill_switch))
    return TradingConfig(
        trading_mode=os.getenv("TRADING_MODE", "real_capped"),
        enable_real_trading=env_bool("ENABLE_REAL_TRADING", False),
        real_bankroll_limit_usd=env_float("REAL_BANKROLL_LIMIT_USD", 10.0),
        max_stake_per_trade_usd=env_float("MAX_STAKE_PER_TRADE_USD", 0.5),
        max_stake_per_match_usd=env_float("MAX_STAKE_PER_MATCH_USD", 1.0),
        max_daily_stake_usd=env_float("MAX_DAILY_STAKE_USD", 3.0),
        max_total_open_exposure_usd=env_float("MAX_TOTAL_OPEN_EXPOSURE_USD", 5.0),
        min_edge=env_float("MIN_EDGE", 0.08),
        min_model_probability=env_float("MIN_MODEL_PROBABILITY", 0.40),
        max_entry_price=env_float("MAX_ENTRY_PRICE", 0.85),
        min_market_liquidity_usd=env_float("MIN_MARKET_LIQUIDITY_USD", 100.0),
        max_allowed_spread=env_float("MAX_ALLOWED_SPREAD", 0.08),
        allow_draw_bets=env_bool("ALLOW_DRAW_BETS", True),
        allow_live_bets=env_bool("ALLOW_LIVE_BETS", False),
        allow_multiple_bets_per_match=env_bool("ALLOW_MULTIPLE_BETS_PER_MATCH", False),
        use_limit_orders_only=env_bool("USE_LIMIT_ORDERS_ONLY", True),
        auto_retry_orders=env_bool("AUTO_RETRY_ORDERS", False),
        kill_switch=kill_switch,
        polymarket_api_base_url=os.getenv("POLYMARKET_API_BASE_URL", "https://clob.polymarket.com"),
    )


def public_config(config: TradingConfig | None = None) -> dict[str, object]:
    config = config or load_trading_config()
    payload = asdict(config)
    payload["credentials_present"] = credentials_present()
    payload["safety_notice"] = (
        "Real-money trading is disabled unless ENABLE_REAL_TRADING=true, KILL_SWITCH=false, credentials are present "
        "and every risk check passes."
    )
    return payload


def credentials_present() -> bool:
    return all(
        bool(os.getenv(name))
        for name in (
            "POLYMARKET_PRIVATE_KEY",
            "POLYMARKET_API_KEY",
            "POLYMARKET_API_SECRET",
            "POLYMARKET_API_PASSPHRASE",
        )
    )


def set_kill_switch(enabled: bool) -> dict[str, object]:
    state = load_runtime_state()
    state["kill_switch"] = enabled
    RUNTIME_STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    RUNTIME_STATE_PATH.write_text(json.dumps(state, indent=2), encoding="utf-8")
    return state


def load_runtime_state() -> dict[str, object]:
    if not RUNTIME_STATE_PATH.exists():
        return {}
    return json.loads(RUNTIME_STATE_PATH.read_text(encoding="utf-8"))


def env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def env_float(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        return default
