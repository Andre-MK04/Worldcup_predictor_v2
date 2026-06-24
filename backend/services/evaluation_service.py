from __future__ import annotations

import json
from pathlib import Path

from src.data_sources.data_refresh import read_csv, update_evaluation_metrics


def load_evaluation() -> dict[str, object]:
    summary_path = Path("outputs/model_performance_summary.json")
    table_path = Path("outputs/match_evaluation.csv")
    if not summary_path.exists():
        update_evaluation_metrics()
    summary = json.loads(summary_path.read_text(encoding="utf-8")) if summary_path.exists() else {}
    matches = read_csv(table_path)
    return {"summary": summary, "matches": matches}
