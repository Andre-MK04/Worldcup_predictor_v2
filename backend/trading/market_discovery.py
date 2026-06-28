from __future__ import annotations

from .market_mapping import refresh_market_mapping


def refresh_polymarket_markets() -> dict[str, object]:
    # Automatic market matching is intentionally conservative. Users must review
    # and approve mappings in data/processed/polymarket_market_mapping.csv.
    return refresh_market_mapping()
