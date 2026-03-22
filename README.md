# S&P 500 Financial Dashboard

A full-stack financial research tool for exploring S&P 500 stock data with AI-powered analysis.

**Stack**: Next.js 14 · FastAPI · SQLite · OpenAI GPT-4o · TradingView Charts · Docker

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- An [OpenAI API key](https://platform.openai.com/api-keys) (required for the AI Analyst feature)

---

## Quick Start

### 1. Configure environment

```bash
cp .env.example .env
```

Open `.env` and set your OpenAI key:

```env
OPENAI_API_KEY=sk-...
```

### 2. Start the app

**Production** (optimized Docker images):

```bash
docker compose up --build
```

**Development** (hot reload for both frontend and backend):

```bash
docker compose -f docker-compose.dev.yml up --build
```

### 3. Open the app

| Service | URL |
|---|---|
| App | http://localhost:3000 |
| API | http://localhost:8000 |

> **First boot takes 3–6 minutes.** The backend seeds 5 years of daily OHLCV data for ~500 S&P 500 companies from Yahoo Finance. A progress screen is shown in the browser during seeding. Subsequent starts are instant — data persists in a Docker volume.

---

## Running Without Docker

You need **Python 3.12+** and **[Bun](https://bun.sh)** installed locally.

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example ../.env     # add your OPENAI_API_KEY to .env
uvicorn main:app --reload --port 8000
```

### Frontend

In a separate terminal:

```bash
cd frontend
bun install
bun run dev
```

Open http://localhost:3000. The frontend proxies `/api/*` to `http://localhost:8000` by default (no extra config needed).

> **First boot**: same 3–6 minute seeding applies. The SQLite database is written to `backend/db/stocks.db` locally instead of a Docker volume.

---

## Pages

| Page | URL | Description |
|---|---|---|
| Dashboard | `/` | S&P 500 index chart, top 5 gainers/losers, live ticker tape |
| Explorer | `/explorer` | Sortable/filterable table of all ~500 S&P 500 companies |
| Stock Detail | `/stock/AAPL` | Candlestick chart with zoom/pan, 1W–5Y range, volume bars |
| Notes | `/notes` | Browse all research notes across companies |
| AI Analyst | `/ai` | Natural language queries via GPT-4o |

---

## Features

| Feature | Details |
|---|---|
| **Live Data** | Yahoo Finance via yfinance, refreshed every 1 min during market hours (9:30–4:00 ET) |
| **Dashboard** | S&P 500 index chart, top 5 gainers/losers |
| **Market Explorer** | Sortable/filterable table of all ~500 companies with pagination and search |
| **Stock Detail** | Candlestick chart (zoom/pan), 1W–5Y range, volume bars |
| **Research Notes** | Create notes tagged to a company + date; displayed as pins on the chart |
| **AI Analyst** | Natural language queries powered by GPT-4o; responses render as inline tables and charts |
| **Live Ticker Tape** | Scrolling header showing real-time price updates via WebSocket |

### Example AI queries

- "Which companies had the steepest decline when COVID struck?"
- "Compare AAPL, MSFT and GOOGL over the last 2 years"
- "How did each sector perform in 2023?"
- "Show me the top 10 companies by market cap growth in 2021"

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | Yes | — | Your OpenAI API key |
| `DATABASE_URL` | No | `sqlite+aiosqlite:////app/data/stocks.db` | SQLite connection string |
| `BACKEND_URL` | No | `http://backend:8000` | Backend URL for Next.js rewrites |

---

## Architecture

```
browser → Next.js (port 3000) → /api/* rewrite → FastAPI (port 8000)
                              → /ws/* rewrite  →        ↓
                                                   SQLite (Docker volume)
                                                   yfinance (Yahoo Finance)
                                                   OpenAI GPT-4o
```

### Backend (`/backend`)

| File | Description |
|---|---|
| `main.py` | FastAPI app entry point, router registration, startup/shutdown lifecycle |
| `models.py` | SQLAlchemy 2.0 async ORM (Note model) |
| `tickers.py` | Hardcoded list of 503 S&P 500 tickers with company names and sectors |
| `database.py` | Async SQLAlchemy engine and session setup |
| `routers/stocks.py` | Companies, OHLCV history, market summary, health/seeding progress |
| `routers/notes.py` | CRUD for research notes |
| `routers/ai.py` | GPT-4o chat with function calling + json-render spec output |
| `routers/ws.py` | WebSocket endpoint for real-time price streaming |

### Frontend (`/frontend`)

| Path | Description |
|---|---|
| `app/` | Next.js 14 App Router pages |
| `components/charts/CandlestickChart.tsx` | TradingView Lightweight Charts integration |
| `components/layout/TickerTape.tsx` | Live scrolling price ticker |
| `components/loading/SeedingScreen.tsx` | First-boot progress screen |
| `lib/api.ts` | Axios API client for all backend calls |
| `lib/ws.ts` | WebSocket client for live price updates |
| `lib/json-render/` | Custom json-render catalog + registry (Recharts for AI charts) |
| `hooks/useLivePrices.tsx` | React hook for WebSocket real-time quotes |

---

## API Reference

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Seeding status and progress |
| GET | `/api/companies` | All companies with latest prices |
| GET | `/api/stocks/{ticker}/ohlcv` | OHLCV history (`?start=YYYY-MM-DD&end=YYYY-MM-DD`) |
| GET | `/api/market/summary` | Index data and top movers |
| POST | `/api/notes` | Create a note |
| GET | `/api/notes` | List notes (filter by `?ticker=` or `?date=`) |
| PUT | `/api/notes/{id}` | Update a note |
| DELETE | `/api/notes/{id}` | Delete a note |
| POST | `/api/ai/chat` | AI chat (GPT-4o with tool use) |
| WS | `/ws/prices` | WebSocket for real-time price streaming |

---

## Data Notes

- Data sourced from **Yahoo Finance via yfinance** — free, no API key required
- **~15 second data lag** vs true real-time (polling, not streaming)
- 5 years of daily OHLCV data stored locally in SQLite
- Stock detail pages fetch OHLCV data on-demand from Yahoo Finance (not from the local DB)
- **For educational and research purposes only. Not financial advice.**
