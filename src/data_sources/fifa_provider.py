from __future__ import annotations

from .provider_base import ProviderPayload


class FifaProvider:
    source_name = "fifa"

    def fetch_fixtures(self) -> ProviderPayload:
        return ProviderPayload(
            source=self.source_name,
            warnings=["Official FIFA live provider is not configured. Falling back to local CSV/static schedule."],
        )

    def fetch_results(self) -> ProviderPayload:
        return ProviderPayload(
            source=self.source_name,
            warnings=["Official FIFA live results are not configured. Falling back to local CSV results."],
        )
