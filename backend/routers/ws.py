"""
WebSocket bridge: /ws/prices

One shared yf.AsyncWebSocket connects to Yahoo Finance's real-time feed.
Multiple frontend clients connect here and send {"subscribe": ["AAPL", "MSFT"]}.
The server aggregates subscriptions and forwards matching quotes to interested clients.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any

import yfinance as yf
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

# ---------------------------------------------------------------------------
# Global state — one Yahoo WS bridge, N frontend clients
# ---------------------------------------------------------------------------

_yahoo_ws: yf.AsyncWebSocket | None = None
_yahoo_task: asyncio.Task | None = None
_clients: dict[WebSocket, set[str]] = {}  # client -> subscribed tickers
_lock = asyncio.Lock()


def _all_subscribed_tickers() -> set[str]:
    result: set[str] = set()
    for tickers in _clients.values():
        result.update(tickers)
    return result


async def _broadcast(data: dict[str, Any]) -> None:
    """Forward a Yahoo quote update to all clients subscribed to that ticker."""
    ticker = (data.get("id") or "").upper()
    if not ticker:
        return

    message = json.dumps(data)
    dead: list[WebSocket] = []

    for client_ws, subscriptions in list(_clients.items()):
        if ticker in subscriptions:
            try:
                await client_ws.send_text(message)
            except Exception:
                dead.append(client_ws)

    for ws in dead:
        _clients.pop(ws, None)


async def _run_yahoo_stream() -> None:
    """Long-lived task: connect to Yahoo Finance and forward messages to clients."""
    global _yahoo_ws
    while True:
        try:
            _yahoo_ws = yf.AsyncWebSocket(verbose=False)
            tickers = list(_all_subscribed_tickers())
            if tickers:
                await _yahoo_ws.subscribe(tickers)
            # listen() blocks until connection drops or CancelledError
            await _yahoo_ws.listen(message_handler=_broadcast)
        except asyncio.CancelledError:
            break
        except Exception as exc:
            print(f"[YahooWS] Stream error: {exc}. Reconnecting in 5s...", flush=True)
            await asyncio.sleep(5)


async def ensure_yahoo_stream() -> None:
    """Start the Yahoo WebSocket background task. Called at app startup."""
    global _yahoo_task
    if _yahoo_task is None or _yahoo_task.done():
        _yahoo_task = asyncio.create_task(_run_yahoo_stream())
        print("[YahooWS] Real-time stream started.", flush=True)


async def shutdown_stream() -> None:
    """Gracefully shut down. Called at app shutdown."""
    global _yahoo_task, _yahoo_ws
    if _yahoo_task and not _yahoo_task.done():
        _yahoo_task.cancel()
        try:
            await _yahoo_task
        except asyncio.CancelledError:
            pass
    if _yahoo_ws:
        try:
            await _yahoo_ws.close()
        except Exception:
            pass
    print("[YahooWS] Stream stopped.", flush=True)


# ---------------------------------------------------------------------------
# FastAPI WebSocket endpoint
# ---------------------------------------------------------------------------

@router.websocket("/ws/prices")
async def prices_websocket(websocket: WebSocket) -> None:
    """
    Frontend connects here and sends JSON messages:
      {"subscribe": ["AAPL", "MSFT"]}   — subscribe to tickers
      {"unsubscribe": ["AAPL"]}         — unsubscribe from tickers

    Server streams Yahoo Finance real-time quote updates as JSON.
    """
    await websocket.accept()

    async with _lock:
        _clients[websocket] = set()

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            subscribe_to = [t.upper() for t in msg.get("subscribe", [])]
            unsubscribe_from = [t.upper() for t in msg.get("unsubscribe", [])]

            async with _lock:
                if subscribe_to:
                    _clients[websocket].update(subscribe_to)
                    if _yahoo_ws is not None:
                        try:
                            await _yahoo_ws.subscribe(subscribe_to)
                        except Exception:
                            pass

                if unsubscribe_from:
                    _clients[websocket].difference_update(unsubscribe_from)
                    still_needed = _all_subscribed_tickers()
                    to_unsub = [t for t in unsubscribe_from if t not in still_needed]
                    if to_unsub and _yahoo_ws is not None:
                        try:
                            await _yahoo_ws.unsubscribe(to_unsub)
                        except Exception:
                            pass

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        async with _lock:
            subscriptions = _clients.pop(websocket, set())
            still_needed = _all_subscribed_tickers()
            to_unsub = [t for t in subscriptions if t not in still_needed]
            if to_unsub and _yahoo_ws is not None:
                try:
                    await _yahoo_ws.unsubscribe(to_unsub)
                except Exception:
                    pass
