from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol


FixtureRow = dict[str, str]
ResultRow = dict[str, str]


@dataclass
class ProviderPayload:
    fixtures: list[FixtureRow] = field(default_factory=list)
    results: list[ResultRow] = field(default_factory=list)
    source: str = "unknown"
    warnings: list[str] = field(default_factory=list)


class MatchDataProvider(Protocol):
    source_name: str

    def fetch_fixtures(self) -> ProviderPayload:
        """Fetch latest fixture schedule."""

    def fetch_results(self) -> ProviderPayload:
        """Fetch latest live/final result data."""
