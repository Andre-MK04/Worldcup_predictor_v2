from __future__ import annotations


def build_limit_order(candidate_trade: dict[str, object]) -> dict[str, object]:
    price = float(candidate_trade["market_entry_price"])
    stake = float(candidate_trade["recommended_stake_usd"])
    shares = stake / price if price > 0 else 0
    return {
        "token_id": candidate_trade["token_id"],
        "side": "BUY",
        "limit_price": round(price, 3),
        "stake_usd": round(stake, 2),
        "shares_requested": round(shares, 4),
        "order_type": "GTC",
    }
