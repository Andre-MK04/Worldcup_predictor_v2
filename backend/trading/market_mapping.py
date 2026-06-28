from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from .io import ensure_csv, read_csv, write_csv
from .schemas import MARKET_MAPPING_FIELDS

MAPPING_PATH = Path("data/processed/polymarket_market_mapping.csv")

BLOCKED_MARKET_TERMS = {
    "tournament winner",
    "champion",
    "goalscorer",
    "player",
    "over/under",
    "total goals",
    "to qualify",
    "golden boot",
    "politics",
    "crypto",
}


def ensure_market_mapping_file() -> None:
    ensure_csv(MAPPING_PATH, MARKET_MAPPING_FIELDS)


def load_market_mappings() -> list[dict[str, str]]:
    ensure_market_mapping_file()
    return read_csv(MAPPING_PATH)


def save_market_mappings(rows: list[dict[str, object]]) -> None:
    write_csv(MAPPING_PATH, MARKET_MAPPING_FIELDS, rows)


def refresh_market_mapping() -> dict[str, object]:
    ensure_market_mapping_file()
    rows = load_market_mappings()
    now = datetime.now(timezone.utc).isoformat()
    for row in rows:
        row["last_checked_at"] = now
        if not is_world_cup_match_outcome_text(row.get("polymarket_slug", "")):
            row["mapping_status"] = "rejected"
        elif row.get("mapping_status") not in {"approved", "rejected"}:
            row["mapping_status"] = "needs_review"
    save_market_mappings(rows)
    return {
        "mapping_rows": len(rows),
        "approved": sum(1 for row in rows if row.get("mapping_status") == "approved"),
        "needs_review": sum(1 for row in rows if row.get("mapping_status") == "needs_review"),
        "message": "Market mapping refreshed. Only user-approved mappings can be traded.",
    }


def approved_mapping_for_match(match_id: str) -> dict[str, str] | None:
    for row in load_market_mappings():
        if row.get("match_id") != match_id:
            continue
        if row.get("mapping_status") != "approved":
            return None
        try:
            confidence = float(row.get("mapping_confidence", "0"))
        except ValueError:
            confidence = 0.0
        if confidence < 0.9:
            return None
        if row.get("reviewed_by_user", "").lower() != "true":
            return None
        return row
    return None


def is_world_cup_match_outcome_text(value: str) -> bool:
    text = value.lower()
    if any(term in text for term in BLOCKED_MARKET_TERMS):
        return False
    return "world cup" in text or "fifa" in text or not text
