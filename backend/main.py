from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routes import evaluation, predictions, refresh, results, standings, trading

app = FastAPI(title="World Cup Predictor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(refresh.router, prefix="/api", tags=["refresh"])
app.include_router(results.router, prefix="/api", tags=["results"])
app.include_router(predictions.router, prefix="/api", tags=["predictions"])
app.include_router(standings.router, prefix="/api", tags=["standings"])
app.include_router(evaluation.router, prefix="/api", tags=["evaluation"])
app.include_router(trading.router, prefix="/api", tags=["trading"])
