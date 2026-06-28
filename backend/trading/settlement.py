from __future__ import annotations

from datetime import datetime, timezone

from .trading_ledger import load_ledger, save_ledger


def settle_trades(results: list[dict[str, str]]) -> dict[str, object]:
    result_by_match = {row.get("match_id", ""): row for row in results if row.get("status") == "complete"}
    rows = load_ledger()
    settled = 0
    for row in rows:
        if row.get("status") not in {"filled", "partially_filled"}:
            continue
        result = result_by_match.get(row.get("match_id", ""))
        if not result:
            continue
        actual = result.get("result_label", "")
        stake = float(row.get("stake_usd") or 0)
        shares = float(row.get("filled_shares") or row.get("shares_requested") or 0)
        wins = row.get("outcome") == actual
        row["settled_at"] = datetime.now(timezone.utc).isoformat()
        row["actual_result"] = actual
        row["payout"] = shares if wins else 0
        row["profit_loss"] = (shares - stake) if wins else -stake
        row["roi"] = float(row["profit_loss"]) / stake if stake else ""
        row["status"] = "settled_win" if wins else "settled_loss"
        settled += 1
    save_ledger(rows)
    return {"settled": settled}
