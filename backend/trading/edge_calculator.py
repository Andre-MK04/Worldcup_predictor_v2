from __future__ import annotations


def calculate_edge(model_probability: float, market_entry_price: float) -> dict[str, float]:
    edge = model_probability - market_entry_price
    return {
        "model_probability": model_probability,
        "market_entry_price": market_entry_price,
        "edge": edge,
        "expected_value": edge,
    }
