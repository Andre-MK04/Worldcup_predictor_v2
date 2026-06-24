from __future__ import annotations

from fastapi import APIRouter

from backend.services.evaluation_service import load_evaluation

router = APIRouter()


@router.get("/evaluation")
def get_evaluation() -> dict[str, object]:
    return load_evaluation()
