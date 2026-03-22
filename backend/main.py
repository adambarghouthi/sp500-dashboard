"""
S&P 500 Dashboard — FastAPI application entry point.

Startup sequence:
  1. Create all database tables (init_db).
  2. Launch Yahoo Finance WebSocket stream.
  3. Print disclaimer.
"""

from __future__ import annotations

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from database import init_db
from routers import stocks as stocks_router
from routers import notes as notes_router
from routers import ai as ai_router
from routers import ws as ws_router

_DISCLAIMER = (
    "\n"
    "DISCLAIMER: Data sourced from Yahoo Finance via yfinance.\n"
    "    This is for educational/research purposes only. Not financial advice.\n"
)

app = FastAPI(
    title="S&P 500 Dashboard API",
    description="Real-time S&P 500 data, notes, and AI-powered analysis.",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS — allow all origins for development convenience
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Include routers
# ---------------------------------------------------------------------------

app.include_router(stocks_router.router, prefix="/api")
app.include_router(notes_router.router, prefix="/api")
app.include_router(ai_router.router, prefix="/api")
# WebSocket routes — no /api prefix
app.include_router(ws_router.router)


# ---------------------------------------------------------------------------
# Application lifecycle
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup() -> None:
    await init_db()
    from routers.ws import ensure_yahoo_stream
    await ensure_yahoo_stream()
    print(_DISCLAIMER, flush=True)
    print("S&P 500 Dashboard ready.", flush=True)


@app.on_event("shutdown")
async def shutdown() -> None:
    from routers.ws import shutdown_stream
    await shutdown_stream()


# ---------------------------------------------------------------------------
# Root health check (convenience alias)
# ---------------------------------------------------------------------------

@app.get("/")
async def root():
    return {"message": "S&P 500 Dashboard API is running. See /docs for endpoints."}
