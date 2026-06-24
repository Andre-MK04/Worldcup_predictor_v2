from __future__ import annotations

from fastapi import APIRouter

from backend.services.standings_service import load_standings

router = APIRouter()


@router.get("/standings")
def get_standings() -> list[dict[str, str]]:
    return load_standings()
