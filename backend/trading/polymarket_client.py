from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any

from .config import load_trading_config


@dataclass
class PolymarketClient:
    base_url: str

    @classmethod
    def from_env(cls) -> "PolymarketClient":
        config = load_trading_config()
        return cls(base_url=config.polymarket_api_base_url.rstrip("/"))

    def get_order_book(self, token_id: str) -> dict[str, Any]:
        query = urllib.parse.urlencode({"token_id": token_id})
        return self.get_json(f"/book?{query}")

    def get_json(self, path: str) -> dict[str, Any]:
        url = f"{self.base_url}{path}"
        request = urllib.request.Request(url, headers={"Accept": "application/json"})
        try:
            with urllib.request.urlopen(request, timeout=8) as response:
                return json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            return {"error": str(exc)}
