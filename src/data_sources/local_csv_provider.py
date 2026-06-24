from __future__ import annotations

import csv
from pathlib import Path

from .provider_base import ProviderPayload


class LocalCsvProvider:
    source_name = "local_csv"

    def __init__(self, data_dir: Path | str = "data") -> None:
        self.data_dir = Path(data_dir)
        self.processed_dir = self.data_dir / "processed"
        self.import_dir = self.data_dir / "imports"

    def fetch_fixtures(self) -> ProviderPayload:
        for path in (self.import_dir / "fixtures.csv", self.processed_dir / "fixtures.csv"):
            if path.exists():
                return ProviderPayload(fixtures=_read_csv(path), source=self.source_name)
        return ProviderPayload(
            source=self.source_name,
            warnings=["No local fixtures CSV found. Expected data/imports/fixtures.csv or data/processed/fixtures.csv."],
        )

    def fetch_results(self) -> ProviderPayload:
        for path in (self.import_dir / "results.csv", self.processed_dir / "results.csv"):
            if path.exists():
                return ProviderPayload(results=_read_csv(path), source=self.source_name)
        return ProviderPayload(
            source=self.source_name,
            warnings=["No local results CSV found. Expected data/imports/results.csv or data/processed/results.csv."],
        )


def _read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", newline="", encoding="utf-8") as handle:
        return [dict(row) for row in csv.DictReader(handle)]
