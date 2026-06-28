from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from .io import ensure_csv, read_csv, write_csv
from .schemas import REAL_TRADE_FIELDS, RECOMMENDATION_FIELDS

LEDGER_PATH = Path("data/processed/real_trades.csv")
RECOMMENDATIONS_PATH = Path("data/processed/trade_recommendations.csv")


def ensure_trading_files() -> None:
    ensure_csv(LEDGER_PATH, REAL_TRADE_FIELDS)
    ensure_csv(RECOMMENDATIONS_PATH, RECOMMENDATION_FIELDS)


def load_ledger() -> list[dict[str, str]]:
    ensure_trading_files()
    return read_csv(LEDGER_PATH)


def save_ledger(rows: list[dict[str, object]]) -> None:
    write_csv(LEDGER_PATH, REAL_TRADE_FIELDS, rows)


def append_trade(row: dict[str, object]) -> None:
    rows = load_ledger()
    rows.append(row)
    save_ledger(rows)


def load_recommendations() -> list[dict[str, str]]:
    ensure_trading_files()
    return read_csv(RECOMMENDATIONS_PATH)


def save_recommendations(rows: list[dict[str, object]]) -> None:
    write_csv(RECOMMENDATIONS_PATH, RECOMMENDATION_FIELDS, rows)


def trading_performance() -> dict[str, object]:
    rows = load_ledger()
    total_staked = sum_float(rows, "stake_usd")
    open_exposure = sum(
        float(row.get("stake_usd") or 0)
        for row in rows
        if row.get("status") in {"submitted", "partially_filled", "filled", "approved_by_risk"}
    )
    settled = [row for row in rows if row.get("status") in {"settled_win", "settled_loss"}]
    profit_loss = sum_float(settled, "profit_loss")
    return {
        "as_of": datetime.now(timezone.utc).isoformat(),
        "trade_count": len(rows),
        "total_staked": round(total_staked, 2),
        "open_exposure": round(open_exposure, 2),
        "settled_profit_loss": round(profit_loss, 2),
        "roi": profit_loss / total_staked if total_staked else None,
        "wins": sum(1 for row in settled if row.get("status") == "settled_win"),
        "losses": sum(1 for row in settled if row.get("status") == "settled_loss"),
    }


def sum_float(rows: list[dict[str, str]], field: str) -> float:
    total = 0.0
    for row in rows:
        try:
            total += float(row.get(field) or 0)
        except ValueError:
            continue
    return total
