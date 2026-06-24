from __future__ import annotations

import os

from .provider_base import ProviderPayload


class ApiFootballProvider:
    source_name = "api_football"

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or os.getenv("FOOTBALL_API_KEY")

    def fetch_fixtures(self) -> ProviderPayload:
        if not self.api_key:
            return ProviderPayload(
                source=self.source_name,
                warnings=["FOOTBALL_API_KEY is not set. Using local CSV/static schedule fallback."],
            )
        return ProviderPayload(
            source=self.source_name,
            warnings=["API-Football integration placeholder is present, but no paid API calls are made by default."],
        )

    def fetch_results(self) -> ProviderPayload:
        if not self.api_key:
            return ProviderPayload(
                source=self.source_name,
                warnings=["FOOTBALL_API_KEY is not set. Using local CSV results fallback."],
            )
        return ProviderPayload(
            source=self.source_name,
            warnings=["API-Football integration placeholder is present, but no paid API calls are made by default."],
        )
