from __future__ import annotations

from pathlib import Path

from src.data_sources.data_refresh import read_csv, refresh_group_standings


def load_standings() -> list[dict[str, str]]:
    path = Path("data/processed/live_group_standings.csv")
    if not path.exists():
        refresh_group_standings()
    return read_csv(path)
