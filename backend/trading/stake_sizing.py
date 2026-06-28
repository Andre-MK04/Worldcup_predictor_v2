from __future__ import annotations

from .config import TradingConfig, load_trading_config


def recommend_stake(
    edge: float,
    model_probability: float,
    bankroll_remaining: float,
    config: TradingConfig | None = None,
) -> dict[str, object]:
    config = config or load_trading_config()
    if edge >= 0.18:
        stake = 0.50
        band = "strong edge 18%+"
    elif edge >= 0.12:
        stake = 0.35
        band = "medium edge 12-18%"
    else:
        stake = 0.25
        band = "weak edge 8-12%"
    stake = min(stake, config.max_stake_per_trade_usd, bankroll_remaining)
    return {
        "recommended_stake_usd": max(0.0, round(stake, 2)),
        "stake_reason": f"{band}, capped by conservative $5 bankroll rules at model probability {model_probability:.1%}",
    }
