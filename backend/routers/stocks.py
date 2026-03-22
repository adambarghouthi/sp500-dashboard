"""
Stock data endpoints — backed by on-demand yfinance calls.
"""

from __future__ import annotations

import asyncio
import time
from datetime import date, datetime, timedelta
from functools import wraps
from typing import Any

import pytz
import yfinance as yf
import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from tickers import SP500_TICKERS, SP500_COMPANY_NAMES, SP500_SECTORS

router = APIRouter()

ET = pytz.timezone("America/New_York")

# ---------------------------------------------------------------------------
# Simple TTL cache
# ---------------------------------------------------------------------------

_cache: dict = {}
_CACHE_TTL = 60  # seconds

# Small curated list for movers — fast to fetch, representative of the market
_MOVER_TICKERS = [
    "AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOGL", "TSLA", "BRK-B",
    "JPM", "UNH", "XOM", "JNJ", "V", "PG", "MA", "HD", "CVX", "MRK",
    "ABBV", "LLY", "AVGO", "COST", "ACN", "CSCO", "WMT", "NFLX", "AMD",
    "CRM", "ORCL", "ADBE",
]

# Known S&P 500 sectors (static — doesn't require a yfinance call)
SP500_SECTOR_LIST = [
    "Communication Services",
    "Consumer Discretionary",
    "Consumer Staples",
    "Energy",
    "Financials",
    "Health Care",
    "Industrials",
    "Information Technology",
    "Materials",
    "Real Estate",
    "Utilities",
]


# ---------------------------------------------------------------------------
# Helper: is market currently open?
# ---------------------------------------------------------------------------

def _market_open() -> bool:
    now_et = datetime.now(ET)
    if now_et.weekday() >= 5:
        return False
    mo = now_et.replace(hour=9, minute=30, second=0, microsecond=0)
    mc = now_et.replace(hour=16, minute=0, second=0, microsecond=0)
    return mo <= now_et < mc


# ---------------------------------------------------------------------------
# Helper: build company dict from yfinance row
# ---------------------------------------------------------------------------

def _row_to_company(ticker: str, row: Any) -> dict[str, Any]:
    open_p = float(row.get("Open", 0) or 0)
    close_p = float(row.get("Close", 0) or 0)
    volume = int(row.get("Volume", 0) or 0)
    price_change_pct = ((close_p - open_p) / open_p * 100) if open_p > 0 else 0.0
    return {
        "ticker": ticker,
        "name": SP500_COMPANY_NAMES.get(ticker, ticker),
        "sector": SP500_SECTORS.get(ticker),
        "latest_price": round(close_p, 2),
        "price_change_pct": round(price_change_pct, 2),
        "price_change": round(close_p - open_p, 2),
        "volume": volume,
        "market_cap": None,
    }


# ---------------------------------------------------------------------------
# Helper: download a batch of tickers and return company dicts
# ---------------------------------------------------------------------------

async def _fetch_companies(tickers: list[str]) -> list[dict[str, Any]]:
    if not tickers:
        return []
    loop = asyncio.get_event_loop()
    df = await loop.run_in_executor(None, lambda: yf.download(
        tickers, period="1d", group_by="ticker",
        auto_adjust=True, progress=False, threads=True
    ))
    is_multi = isinstance(df.columns, pd.MultiIndex)
    companies = []
    for ticker in tickers:
        try:
            if is_multi:
                if ticker not in df.columns.get_level_values(0):
                    continue
                ticker_df = df[ticker].dropna(how="all")
            else:
                ticker_df = df.dropna(how="all")
            if ticker_df.empty:
                continue
            companies.append(_row_to_company(ticker, ticker_df.iloc[-1]))
        except (KeyError, IndexError, TypeError):
            continue
    return companies


# ---------------------------------------------------------------------------
# GET /api/health
# ---------------------------------------------------------------------------

@router.get("/health")
async def health() -> dict[str, Any]:
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# GET /api/sectors
# ---------------------------------------------------------------------------

@router.get("/sectors")
async def get_sectors() -> list[str]:
    return SP500_SECTOR_LIST


# Fields that can be sorted server-side
_SORTABLE = {"ticker", "name", "sector", "latest_price", "price_change_pct", "price_change", "volume"}

# Threshold: if filtered set is this size or smaller, fetch all and sort globally
_FULL_FETCH_LIMIT = 150


# ---------------------------------------------------------------------------
# GET /api/companies  (paginated + server-side sort)
# ---------------------------------------------------------------------------

@router.get("/companies")
async def get_companies(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    search: str = Query(default=""),
    sector: str = Query(default=""),
    sort_by: str = Query(default="ticker"),
    sort_dir: str = Query(default="asc"),
) -> dict[str, Any]:
    # Filter ticker universe
    tickers = SP500_TICKERS
    if search:
        s = search.lower()
        tickers = [t for t in tickers if s in t.lower() or s in SP500_COMPANY_NAMES.get(t, "").lower()]
    if sector:
        tickers = [t for t in tickers if SP500_SECTORS.get(t) == sector]

    total = len(tickers)
    now = time.time()

    if total <= _FULL_FETCH_LIMIT:
        # Fetch all matching, sort globally, then paginate
        full_key = f"full|{search}|{sector}"
        if full_key in _cache and now - _cache[full_key]["ts"] < _CACHE_TTL:
            all_items = _cache[full_key]["data"]
        else:
            all_items = await _fetch_companies(tickers)
            _cache[full_key] = {"ts": time.time(), "data": all_items}

        if sort_by in _SORTABLE:
            reverse = sort_dir == "desc"
            all_items = sorted(
                all_items,
                key=lambda x: (x.get(sort_by) is None, x.get(sort_by) or 0 if sort_by not in ("ticker", "name", "sector") else (x.get(sort_by) or "")),
                reverse=reverse,
            )

        items = all_items[(page - 1) * per_page: page * per_page]
        return {"items": items, "total": total, "page": page, "per_page": per_page}

    # Large unfiltered set — paginate without global sort
    page_tickers = tickers[(page - 1) * per_page: page * per_page]
    if not page_tickers:
        return {"items": [], "total": total, "page": page, "per_page": per_page}

    cache_key = f"companies|{page}|{per_page}|{search}|{sector}"
    if cache_key in _cache and now - _cache[cache_key]["ts"] < _CACHE_TTL:
        return _cache[cache_key]["data"]

    items = await _fetch_companies(page_tickers)
    result = {"items": items, "total": total, "page": page, "per_page": per_page}
    _cache[cache_key] = {"ts": time.time(), "data": result}
    return result


# ---------------------------------------------------------------------------
# GET /api/stocks/{ticker}/ohlcv
# ---------------------------------------------------------------------------

@router.get("/stocks/{ticker}/ohlcv")
async def get_ohlcv(
    ticker: str,
    start: date | None = Query(default=None),
    end: date | None = Query(default=None),
    interval: str = Query(default="1d"),
) -> list[dict[str, Any]]:
    ticker = ticker.upper()

    if ticker not in SP500_TICKERS:
        raise HTTPException(status_code=404, detail=f"Ticker {ticker} not found")

    if end is None:
        end = date.today()
    if start is None:
        start = end - timedelta(days=365)

    loop = asyncio.get_event_loop()
    hist = await loop.run_in_executor(
        None,
        lambda: yf.Ticker(ticker).history(
            start=start.isoformat(),
            end=end.isoformat(),
            interval=interval,
        ),
    )

    if hist.empty:
        return []

    result = []
    for idx, row in hist.iterrows():
        dt = idx
        if hasattr(dt, "date"):
            dt = dt.date()
        result.append({
            "date": dt.isoformat(),
            "open": round(float(row["Open"]), 4),
            "high": round(float(row["High"]), 4),
            "low": round(float(row["Low"]), 4),
            "close": round(float(row["Close"]), 4),
            "volume": int(row["Volume"]),
        })

    return result


# ---------------------------------------------------------------------------
# GET /api/market/summary
# ---------------------------------------------------------------------------

@router.get("/market/summary")
async def market_summary() -> dict[str, Any]:
    loop = asyncio.get_event_loop()

    # Movers from small curated list (fast)
    movers_key = "movers"
    now = time.time()
    if movers_key in _cache and now - _cache[movers_key]["ts"] < _CACHE_TTL:
        top_gainers, top_losers = _cache[movers_key]["data"]
    else:
        movers = await _fetch_companies(_MOVER_TICKERS)
        movers_sorted = sorted(movers, key=lambda x: x["price_change_pct"], reverse=True)
        top_gainers = movers_sorted[:5]
        top_losers = list(reversed(movers_sorted[-5:]))
        _cache[movers_key] = {"ts": time.time(), "data": (top_gainers, top_losers)}

    # SPY intraday chart
    spy_hist = await loop.run_in_executor(
        None,
        lambda: yf.Ticker("SPY").history(period="1d", interval="1m"),
    )
    if spy_hist.empty:
        spy_hist = await loop.run_in_executor(
            None,
            lambda: yf.Ticker("SPY").history(period="1mo", interval="1d"),
        )

    index_data = []
    for idx, row in spy_hist.iterrows():
        ts = idx
        ts_str = ts.isoformat() if hasattr(ts, "isoformat") else str(ts)
        index_data.append({"time": ts_str, "value": round(float(row["Close"]), 2)})

    return {
        "index_data": index_data,
        "top_gainers": top_gainers,
        "top_losers": top_losers,
        "market_open": _market_open(),
    }
