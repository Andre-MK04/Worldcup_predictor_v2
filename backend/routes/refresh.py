from __future__ import annotations

from fastapi import APIRouter

from backend.services.refresh_service import load_fixtures, refresh_status, run_refresh

router = APIRouter()


@router.get("/fixtures")
def get_fixtures() -> list[dict[str, str]]:
    return load_fixtures()


@router.post("/refresh")
def refresh_data() -> dict[str, object]:
    return run_refresh()


@router.get("/refresh/status")
def get_refresh_status() -> dict[str, object]:
    return refresh_status()
