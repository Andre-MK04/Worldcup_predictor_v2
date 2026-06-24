from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter

from src.data_sources.data_refresh import read_csv

router = APIRouter()


@router.get("/predictions")
def get_predictions() -> list[dict[str, str]]:
    return read_csv(Path("data/processed/predictions.csv"))
