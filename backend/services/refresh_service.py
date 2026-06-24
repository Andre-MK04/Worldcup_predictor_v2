from __future__ import annotations

from pathlib import Path

from src.data_sources.data_refresh import read_csv, refresh_all_data, refresh_fixtures, write_json


def run_refresh() -> dict[str, object]:
    return refresh_all_data()


def refresh_status() -> dict[str, object]:
    path = Path("outputs/data_refresh_report.json")
    if not path.exists():
        fixtures = refresh_fixtures([])
        status = {
            "refreshed_at": None,
            "matches_total": len(fixtures),
            "matches_complete": 0,
            "matches_live": 0,
            "matches_scheduled": len(fixtures),
            "results_updated": 0,
            "standings_updated": False,
            "evaluation_updated": False,
            "warnings": ["Data has not been refreshed in this environment yet."],
        }
        write_json(path, status)
        return status
    import json

    return json.loads(path.read_text(encoding="utf-8"))


def load_fixtures() -> list[dict[str, str]]:
    refresh_fixtures([])
    return read_csv(Path("data/processed/fixtures.csv"))
