import axios from 'axios'
import type { CompaniesPage, OHLCVData, Note, MarketSummary, HealthStatus } from './types'

const api = axios.create({ baseURL: '/api' })

export const stocksApi = {
  getCompanies: (page = 1, perPage = 20, search = '', sector = '', sortBy = 'ticker', sortDir = 'asc'): Promise<CompaniesPage> =>
    api.get('/companies', { params: { page, per_page: perPage, search, sector, sort_by: sortBy, sort_dir: sortDir } }).then(r => r.data),

  getSectors: (): Promise<string[]> =>
    api.get('/sectors').then(r => r.data),

  getOHLCV: (ticker: string, start?: string, end?: string): Promise<OHLCVData[]> =>
    api.get(`/stocks/${ticker}/ohlcv`, { params: { start, end } }).then(r => r.data),

  getMarketSummary: (): Promise<MarketSummary> =>
    api.get('/market/summary').then(r => r.data),

  getHealth: (): Promise<HealthStatus> =>
    api.get('/health').then(r => r.data),
}

export const notesApi = {
  getNotes: (ticker?: string, date?: string): Promise<Note[]> =>
    api.get('/notes', { params: { ticker, date } }).then(r => r.data),

  createNote: (note: { ticker: string; date: string; title: string; body: string }): Promise<Note> =>
    api.post('/notes', note).then(r => r.data),

  updateNote: (id: number, data: { title: string; body: string }): Promise<Note> =>
    api.put(`/notes/${id}`, data).then(r => r.data),

  deleteNote: (id: number): Promise<void> =>
    api.delete(`/notes/${id}`).then(r => r.data),
}

export const aiApi = {
  chat: (messages: { role: string; content: string }[]): Promise<{ type: 'text' | 'spec'; content: string | object }> =>
    api.post('/ai/chat', { messages }).then(r => r.data),
}
