from __future__ import annotations

from .polymarket_client import PolymarketClient


def fetch_outcome_price(token_id: str, client: PolymarketClient | None = None) -> dict[str, object]:
    if not token_id:
        return empty_price("missing token id")
    client = client or PolymarketClient.from_env()
    book = client.get_order_book(token_id)
    if book.get("error"):
        return empty_price(str(book["error"]))

    bids = normalize_levels(book.get("bids", []))
    asks = normalize_levels(book.get("asks", []))
    best_bid = max((price for price, _size in bids), default=None)
    best_ask = min((price for price, _size in asks), default=None)
    spread = best_ask - best_bid if best_bid is not None and best_ask is not None else None
    liquidity = sum(price * size for price, size in bids + asks)
    mid_price = (best_bid + best_ask) / 2 if best_bid is not None and best_ask is not None else None

    return {
        "best_bid": best_bid,
        "best_ask": best_ask,
        "mid_price": mid_price,
        "last_price": book.get("last_price") or book.get("lastPrice"),
        "spread": spread,
        "liquidity": liquidity,
        "volume": book.get("volume", 0),
        "market_closed": bool(book.get("closed", False)),
        "error": "",
    }


def normalize_levels(levels: object) -> list[tuple[float, float]]:
    output: list[tuple[float, float]] = []
    if not isinstance(levels, list):
        return output
    for level in levels:
        if isinstance(level, dict):
            raw_price = level.get("price")
            raw_size = level.get("size")
        elif isinstance(level, (list, tuple)) and len(level) >= 2:
            raw_price, raw_size = level[0], level[1]
        else:
            continue
        try:
            output.append((float(raw_price), float(raw_size)))
        except (TypeError, ValueError):
            continue
    return output


def empty_price(error: str) -> dict[str, object]:
    return {
        "best_bid": None,
        "best_ask": None,
        "mid_price": None,
        "last_price": None,
        "spread": None,
        "liquidity": 0,
        "volume": 0,
        "market_closed": False,
        "error": error,
    }
