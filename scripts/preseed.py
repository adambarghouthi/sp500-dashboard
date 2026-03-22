#!/usr/bin/env python3
"""
Pre-seed script — runs on the HOST machine (not in Docker) to generate
a pre-populated SQLite database that gets baked into the Docker image.

Usage:
    cd adam-tetrix
    pip install yfinance sqlalchemy aiosqlite pandas
    python scripts/preseed.py

Output: backend/db/stocks.db  (~50 MB, ~630k rows, all S&P 500, 5y daily OHLCV)
"""

from __future__ import annotations

import asyncio
import sys
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path

# Add backend to path so we can import models/tickers
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

import pandas as pd
import yfinance as yf
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from models import Base, Company, StockPrice
from tickers import SP500_TICKERS, SP500_COMPANY_NAMES

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

DB_PATH = Path(__file__).parent.parent / "backend" / "db" / "stocks.db"
HISTORY_PERIOD = "5y"
MAX_WORKERS = 30

# ---------------------------------------------------------------------------

def _progress_bar(current: int, total: int, width: int = 30) -> str:
    filled = int(width * current / total) if total else 0
    bar = "█" * filled + "░" * (width - filled)
    pct = int(100 * current / total) if total else 0
    return f"\r  [{bar}] {pct:3d}%  {current}/{total}  {' ' * 10}"


def _fetch_ticker(ticker: str) -> tuple[str, pd.DataFrame]:
    try:
        df = yf.Ticker(ticker).history(period=HISTORY_PERIOD, interval="1d", auto_adjust=True, raise_errors=False)
        return ticker, df if df is not None else pd.DataFrame()
    except Exception as exc:
        print(f"\n    ⚠  {ticker}: {exc}", flush=True)
        return ticker, pd.DataFrame()


async def _upsert_company(session: AsyncSession, ticker: str) -> None:
    name = SP500_COMPANY_NAMES.get(ticker, ticker)
    stmt = sqlite_insert(Company).values(ticker=ticker, name=name)
    stmt = stmt.on_conflict_do_nothing(index_elements=["ticker"])
    await session.execute(stmt)


async def _upsert_prices(session: AsyncSession, ticker: str, df: pd.DataFrame) -> int:
    if df.empty:
        return 0
    rows = 0
    for row_date, row in df.iterrows():
        try:
            price_date: date = row_date.date() if hasattr(row_date, "date") else row_date
            stmt = sqlite_insert(StockPrice).values(
                ticker=ticker,
                date=price_date,
                open=float(row["Open"]),
                high=float(row["High"]),
                low=float(row["Low"]),
                close=float(row["Close"]),
                volume=int(row["Volume"]),
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["ticker", "date"],
                set_={
                    "open": stmt.excluded.open,
                    "high": stmt.excluded.high,
                    "low": stmt.excluded.low,
                    "close": stmt.excluded.close,
                    "volume": stmt.excluded.volume,
                },
            )
            await session.execute(stmt)
            rows += 1
        except Exception as exc:
            print(f"\n    ⚠  Row error {ticker} {row_date}: {exc}", flush=True)
    await session.commit()
    return rows


async def main() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    if DB_PATH.exists():
        print(f"Removing existing DB: {DB_PATH}")
        DB_PATH.unlink()

    engine = create_async_engine(f"sqlite+aiosqlite:///{DB_PATH}", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    SessionFactory = async_sessionmaker(engine, expire_on_commit=False)

    tickers = SP500_TICKERS
    total = len(tickers)
    completed = 0

    print(f"\n⚠️  DISCLAIMER: Data sourced from Yahoo Finance. Educational use only.\n")
    print(f"Seeding {total} S&P 500 tickers ({HISTORY_PERIOD} history) with {MAX_WORKERS} workers...\n")

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {pool.submit(_fetch_ticker, t): t for t in tickers}
        pending = set(futures.keys())

        while pending:
            done_batch = {f for f in list(pending) if f.done()}
            if not done_batch:
                await asyncio.sleep(0.1)
                continue

            for fut in done_batch:
                pending.discard(fut)
                ticker, df = fut.result()
                async with SessionFactory() as session:
                    await _upsert_company(session, ticker)
                    await _upsert_prices(session, ticker, df)
                completed += 1
                print(_progress_bar(completed, total), end="", flush=True)

    await engine.dispose()

    size_mb = DB_PATH.stat().st_size / 1_048_576
    print(f"\n\n✅  Done! {DB_PATH}  ({size_mb:.1f} MB)")
    print(f"   Run: docker compose build backend && docker compose up\n")


if __name__ == "__main__":
    asyncio.run(main())
