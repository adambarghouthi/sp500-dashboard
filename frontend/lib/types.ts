export interface Company {
  ticker: string
  name: string
  sector: string | null
  market_cap: number | null
  latest_price: number | null
  price_change: number | null
  price_change_pct: number | null
  volume: number | null
}

export interface CompaniesPage {
  items: Company[]
  total: number
  page: number
  per_page: number
}

export interface OHLCVData {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface Note {
  id: number
  ticker: string
  date: string
  title: string
  body: string
  created_at: string
  updated_at: string
}

export interface MarketSummary {
  index_data: { time: string; value: number }[]
  top_gainers: Company[]
  top_losers: Company[]
  market_open: boolean
}

export interface HealthStatus {
  status: string
}

export interface LivePrice {
  id: string
  price: number
  change: number
  changePercent: number
  dayVolume: number
  dayHigh: number
  dayLow: number
  previousClose: number
  shortName?: string
  marketHours?: string
  time?: number
}

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
  spec?: JsonRenderSpec
  type?: 'text' | 'spec'
}

export interface JsonRenderSpec {
  root: string
  elements: Record<string, {
    type: string
    props: Record<string, unknown>
    children?: string[]
  }>
}
