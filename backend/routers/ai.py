"""
AI chat endpoint backed by OpenAI GPT-4o with function calling.

The assistant can query Yahoo Finance via yfinance tool calls and returns
responses either as plain text or as a json-render spec for the frontend to
render interactively.
"""

from __future__ import annotations

import asyncio
import json
import os
import time
from datetime import date, timedelta
from typing import Any

import pandas as pd
import yfinance as yf
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from openai import AsyncOpenAI
from pydantic import BaseModel

from tickers import SP500_TICKERS, SP500_COMPANY_NAMES, SP500_SECTORS

load_dotenv()

router = APIRouter()

_openai_client: AsyncOpenAI | None = None

# ---------------------------------------------------------------------------
# Concurrency guard and TTL cache for expensive bulk downloads
# ---------------------------------------------------------------------------

_download_sem = asyncio.Semaphore(2)  # max 2 concurrent bulk yfinance downloads
_ai_cache: dict = {}
_AI_CACHE_TTL = 300  # 5 minutes for expensive bulk queries


def _get_openai() -> AsyncOpenAI:
    global _openai_client
    if _openai_client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=503,
                detail="OPENAI_API_KEY is not configured on the server.",
            )
        _openai_client = AsyncOpenAI(api_key=api_key)
    return _openai_client


# ---------------------------------------------------------------------------
# yfinance download helper
# ---------------------------------------------------------------------------

async def _yf_download(tickers, **kwargs):
    async with _download_sem:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, lambda: yf.download(
            tickers, progress=False, threads=True, auto_adjust=True, **kwargs
        ))


def _smart_interval(start: str, end: str) -> str:
    """Use monthly data for ranges > 60 days — we only need start/end prices."""
    try:
        d0 = date.fromisoformat(start)
        d1 = date.fromisoformat(end)
        return "1mo" if (d1 - d0).days > 60 else "1d"
    except ValueError:
        return "1d"


# ---------------------------------------------------------------------------
# Tool definitions
# ---------------------------------------------------------------------------

TOOLS: list[dict] = [
    {
        "type": "function",
        "function": {
            "name": "query_stocks",
            "description": "Query stock price data for specific tickers and date range",
            "parameters": {
                "type": "object",
                "properties": {
                    "tickers": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of ticker symbols (e.g. ['AAPL', 'MSFT'])",
                    },
                    "start_date": {
                        "type": "string",
                        "format": "date",
                        "description": "Start date YYYY-MM-DD",
                    },
                    "end_date": {
                        "type": "string",
                        "format": "date",
                        "description": "End date YYYY-MM-DD",
                    },
                    "metric": {
                        "type": "string",
                        "enum": ["close", "open", "high", "low", "volume"],
                        "description": "Which price metric to return",
                    },
                },
                "required": ["tickers", "start_date", "end_date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_top_movers",
            "description": "Get top gaining or losing stocks for a date range",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {
                        "type": "string",
                        "description": "Start date YYYY-MM-DD",
                    },
                    "end_date": {
                        "type": "string",
                        "description": "End date YYYY-MM-DD",
                    },
                    "direction": {
                        "type": "string",
                        "enum": ["up", "down"],
                        "description": "'up' for top gainers, 'down' for top losers",
                    },
                    "n": {
                        "type": "integer",
                        "default": 10,
                        "description": "How many results to return",
                    },
                    "sector": {
                        "type": "string",
                        "description": "Optional sector filter (e.g. 'Technology')",
                    },
                },
                "required": ["start_date", "end_date", "direction"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compare_companies",
            "description": "Compare multiple companies' performance over a time period",
            "parameters": {
                "type": "object",
                "properties": {
                    "tickers": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of ticker symbols to compare",
                    },
                    "start_date": {
                        "type": "string",
                        "description": "Start date YYYY-MM-DD",
                    },
                    "end_date": {
                        "type": "string",
                        "description": "End date YYYY-MM-DD",
                    },
                },
                "required": ["tickers", "start_date", "end_date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_sector_performance",
            "description": "Get average performance by sector for a date range",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {
                        "type": "string",
                        "description": "Start date YYYY-MM-DD",
                    },
                    "end_date": {
                        "type": "string",
                        "description": "End date YYYY-MM-DD",
                    },
                },
                "required": ["start_date", "end_date"],
            },
        },
    },
]

# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are a financial data analyst assistant for an S&P 500 dashboard.
You have access to real-time and historical data from Yahoo Finance. Historical data goes back as far as the ticker has been listed — typically 20+ years for S&P 500 companies.

When answering questions about stock data, use the provided tools to fetch data, then return your response as a json-render spec.

The json-render spec format is:
{
  "root": "element-id",
  "elements": {
    "element-id": {
      "type": "ComponentName",
      "props": {...},
      "children": ["child-id"]
    }
  }
}

Available components:
- Card: { title: string, description?: string } — wraps other components
- Table: { columns: string[], rows: string[][], caption?: string } — data table (all cell values as strings)
- LineChart: { title: string, data: [{date: string, [key]: number}], lines: [{key: string, color?: string}] } — line chart
- BarChart: { title: string, data: [{label: string, value: number}], color?: string } — bar chart
- Badge: { text: string, variant?: "default"|"success"|"destructive"|"warning" }
- Alert: { title: string, description: string, variant?: "default"|"destructive" }

Composition: a Card can have children (array of element IDs) rendered inside it.
Always set "root" to the top-level element.

Rules:
1. For greetings, off-topic questions, or questions that require no data, return a plain text response (no json-render spec).
2. For any financial data question, ALWAYS return a json-render spec as the only content of your message.
3. Start the json-render spec on its own line, no prose before or after.
4. Keep commentary concise — use the Card description field.
5. Format numbers: prices as "$X.XX", percentages as "X.XX%", volume with commas.
6. If a query returns no results, try adjusting the date range before returning an Alert.

Examples:
- "Which companies had the steepest decline during COVID?" → call get_top_movers(start_date="2020-02-01", end_date="2020-04-30", direction="down", n=10)
- "Compare AAPL vs MSFT over 2023" → call compare_companies → LineChart spec
- "How did sectors perform in Q1 2023?" → call get_sector_performance → BarChart spec
- "Top 10 companies by recent performance" → call get_top_movers with a recent date range, direction="up", n=10
"""

# ---------------------------------------------------------------------------
# Tool execution against yfinance
# ---------------------------------------------------------------------------

async def _exec_query_stocks(args: dict) -> str:
    tickers = [t.upper() for t in args["tickers"]]
    start = args["start_date"]
    end = args["end_date"]
    metric = args.get("metric", "close")

    df = await _yf_download(tickers, start=start, end=end, group_by="ticker")

    col_name = metric.capitalize()
    data: dict[str, list[dict]] = {}

    if df.empty:
        return json.dumps({"metric": metric, "data": {}})

    for ticker in tickers:
        try:
            if len(tickers) > 1:
                ticker_df = df[ticker][[col_name]].dropna()
            else:
                ticker_df = df[[col_name]].dropna()
            series = []
            for idx, row in ticker_df.iterrows():
                dt = idx.date() if hasattr(idx, "date") else idx
                series.append({"date": dt.isoformat(), "value": float(row[col_name])})
            if series:
                data[ticker] = series
        except (KeyError, TypeError):
            continue

    return json.dumps({"metric": metric, "data": data})


async def _exec_get_top_movers(args: dict) -> str:
    start = args["start_date"]
    end = args["end_date"]
    direction = args.get("direction", "up")
    n = int(args.get("n", 10))
    sector_filter = args.get("sector")

    cache_key = f"movers:{start}:{end}:{direction}:{n}:{sector_filter}"
    now = time.time()
    if cache_key in _ai_cache and now - _ai_cache[cache_key]["ts"] < _AI_CACHE_TTL:
        return _ai_cache[cache_key]["data"]

    # Only download tickers in the requested sector (if filtered)
    tickers_to_fetch = [t for t in SP500_TICKERS if not sector_filter or SP500_SECTORS.get(t) == sector_filter]
    interval = _smart_interval(start, end)
    df = await _yf_download(tickers_to_fetch, start=start, end=end, group_by="ticker", interval=interval)

    if df.empty:
        return json.dumps([])

    is_multi = isinstance(df.columns, pd.MultiIndex)
    movers = []
    for ticker in tickers_to_fetch:
        sector = SP500_SECTORS.get(ticker)
        try:
            if is_multi:
                if ticker not in df.columns.get_level_values(0):
                    continue
                closes = df[ticker]["Close"].dropna()
            else:
                closes = df["Close"].dropna()
            if len(closes) < 2:
                continue
            start_price = float(closes.iloc[0])
            end_price = float(closes.iloc[-1])
            if start_price <= 0:
                continue
            change_pct = (end_price - start_price) / start_price * 100
            movers.append({
                "ticker": ticker,
                "name": SP500_COMPANY_NAMES.get(ticker, ticker),
                "sector": sector,
                "start_price": round(start_price, 2),
                "end_price": round(end_price, 2),
                "change_pct": round(change_pct, 2),
            })
        except (KeyError, IndexError, TypeError):
            continue

    movers.sort(key=lambda x: x["change_pct"], reverse=(direction == "up"))
    result = json.dumps(movers[:n])
    _ai_cache[cache_key] = {"ts": time.time(), "data": result}
    return result


async def _exec_compare_companies(args: dict) -> str:
    tickers = [t.upper() for t in args["tickers"]]
    start = args["start_date"]
    end = args["end_date"]

    df = await _yf_download(tickers, start=start, end=end, group_by="ticker")

    if df.empty:
        return json.dumps({"tickers": tickers, "names": {}, "chart_data": []})

    # Normalise each ticker's close series to % return from day 0
    series: dict[str, dict[str, float]] = {}
    names: dict[str, str] = {}

    for ticker in tickers:
        names[ticker] = SP500_COMPANY_NAMES.get(ticker, ticker)
        try:
            if len(tickers) > 1:
                closes = df[ticker]["Close"].dropna()
            else:
                closes = df["Close"].dropna()
            if closes.empty:
                continue
            base = float(closes.iloc[0])
            if base == 0:
                continue
            for idx, val in closes.items():
                dt = idx.date() if hasattr(idx, "date") else idx
                d_str = dt.isoformat()
                if d_str not in series:
                    series[d_str] = {"date": d_str}
                series[d_str][ticker] = round((float(val) - base) / base * 100, 2)
        except (KeyError, TypeError):
            continue

    return json.dumps({
        "tickers": tickers,
        "names": names,
        "chart_data": list(series.values()),
    })


async def _exec_get_sector_performance(args: dict) -> str:
    start = args["start_date"]
    end = args["end_date"]

    cache_key = f"sectors:{start}:{end}"
    now = time.time()
    if cache_key in _ai_cache and now - _ai_cache[cache_key]["ts"] < _AI_CACHE_TTL:
        return _ai_cache[cache_key]["data"]

    interval = _smart_interval(start, end)
    df = await _yf_download(SP500_TICKERS, start=start, end=end, group_by="ticker", interval=interval)

    if df.empty:
        return json.dumps([])

    is_multi = isinstance(df.columns, pd.MultiIndex)
    sector_returns: dict[str, list[float]] = {}

    for ticker in SP500_TICKERS:
        sector = SP500_SECTORS.get(ticker) or "Unknown"
        try:
            if is_multi:
                if ticker not in df.columns.get_level_values(0):
                    continue
                closes = df[ticker]["Close"].dropna()
            else:
                closes = df["Close"].dropna()
            if len(closes) < 2:
                continue
            start_price = float(closes.iloc[0])
            end_price = float(closes.iloc[-1])
            if start_price <= 0:
                continue
            pct = (end_price - start_price) / start_price * 100
            sector_returns.setdefault(sector, []).append(pct)
        except (KeyError, IndexError, TypeError):
            continue

    result_list = []
    for sector, returns in sector_returns.items():
        if returns:
            avg = round(sum(returns) / len(returns), 2)
            result_list.append({
                "sector": sector,
                "avg_return_pct": avg,
                "num_companies": len(returns),
            })

    result_list.sort(key=lambda x: x["avg_return_pct"], reverse=True)
    result = json.dumps(result_list)
    _ai_cache[cache_key] = {"ts": time.time(), "data": result}
    return result


async def _dispatch_tool(name: str, args: dict) -> str:
    """Route a tool call to the appropriate implementation."""
    if name == "query_stocks":
        return await _exec_query_stocks(args)
    elif name == "get_top_movers":
        return await _exec_get_top_movers(args)
    elif name == "compare_companies":
        return await _exec_compare_companies(args)
    elif name == "get_sector_performance":
        return await _exec_get_sector_performance(args)
    else:
        return json.dumps({"error": f"Unknown tool: {name}"})


# ---------------------------------------------------------------------------
# Request schema
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


# ---------------------------------------------------------------------------
# POST /api/ai/chat
# ---------------------------------------------------------------------------

@router.post("/ai/chat")
async def chat(payload: ChatRequest) -> dict[str, Any]:
    """
    Multi-turn chat with GPT-4o + tool calling.

    Returns: { type: "text" | "spec", content: str | dict }
    """
    client = _get_openai()

    # Build messages list for OpenAI
    messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in payload.messages:
        messages.append({"role": msg.role, "content": msg.content})

    MAX_TOOL_ROUNDS = 5

    for _ in range(MAX_TOOL_ROUNDS):
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
            temperature=0.2,
        )

        choice = response.choices[0]
        msg = choice.message

        # Append assistant message (may include tool_calls)
        messages.append(msg.model_dump(exclude_none=True))

        if choice.finish_reason == "tool_calls" and msg.tool_calls:
            # Execute all tool calls and append results
            for tc in msg.tool_calls:
                try:
                    args = json.loads(tc.function.arguments)
                    tool_result = await _dispatch_tool(tc.function.name, args)
                except Exception as exc:  # noqa: BLE001
                    tool_result = json.dumps({"error": str(exc)})

                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": tool_result,
                    }
                )
            # Continue loop to get final response
            continue

        # No more tool calls — we have the final response
        content = (msg.content or "").strip()
        break
    else:
        content = "I was unable to complete the analysis. Please try again."

    # Detect whether the response is a json-render spec (may be wrapped in ```json ... ```)
    try:
        stripped = content.strip()
        # Strip markdown code fences if present
        if stripped.startswith("```"):
            stripped = stripped.split("\n", 1)[-1]
            if stripped.endswith("```"):
                stripped = stripped.rsplit("```", 1)[0].strip()
        if stripped.startswith("{"):
            parsed = json.loads(stripped)
            if "root" in parsed and "elements" in parsed:
                return {"type": "spec", "content": parsed}
    except (json.JSONDecodeError, KeyError):
        pass

    return {"type": "text", "content": content}
