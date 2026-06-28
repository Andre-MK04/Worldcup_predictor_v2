from __future__ import annotations

from pydantic import BaseModel
from fastapi import APIRouter

from backend.trading.config import load_trading_config, public_config, set_kill_switch
from backend.trading.market_discovery import refresh_polymarket_markets
from backend.trading.order_executor import cancel_order, execute_real_trade
from backend.trading.recommendations import generate_recommendations
from backend.trading.trading_ledger import (
    ensure_trading_files,
    load_ledger,
    load_recommendations,
    trading_performance,
)

router = APIRouter()


class ExecuteTradePayload(BaseModel):
    trade_id: str
    confirmation_text: str


class CancelOrderPayload(BaseModel):
    order_id: str


class KillSwitchPayload(BaseModel):
    enabled: bool


@router.get("/trading/config")
def get_trading_config() -> dict[str, object]:
    ensure_trading_files()
    return public_config(load_trading_config())


@router.get("/trading/recommendations")
def get_trading_recommendations() -> list[dict[str, str]]:
    ensure_trading_files()
    return load_recommendations()


@router.post("/trading/refresh-polymarket")
def refresh_polymarket() -> dict[str, object]:
    return refresh_polymarket_markets()


@router.post("/trading/generate-recommendations")
def generate_trading_recommendations() -> dict[str, object]:
    return generate_recommendations()


@router.post("/trading/execute-real-trade")
def execute_trade(payload: ExecuteTradePayload) -> dict[str, object]:
    return execute_real_trade(payload.trade_id, payload.confirmation_text)


@router.post("/trading/cancel-order")
def cancel_trade_order(payload: CancelOrderPayload) -> dict[str, object]:
    return cancel_order(payload.order_id)


@router.get("/trading/ledger")
def get_trading_ledger() -> list[dict[str, str]]:
    ensure_trading_files()
    return load_ledger()


@router.get("/trading/performance")
def get_trading_performance() -> dict[str, object]:
    return trading_performance()


@router.post("/trading/kill-switch")
def update_kill_switch(payload: KillSwitchPayload) -> dict[str, object]:
    state = set_kill_switch(payload.enabled)
    return {"kill_switch": state.get("kill_switch", True), "config": public_config(load_trading_config())}
