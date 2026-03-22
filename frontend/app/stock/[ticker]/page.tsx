'use client'

import { useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { stocksApi, notesApi } from '@/lib/api'
import { formatPrice, formatVolume, formatMarketCap } from '@/lib/utils'
import { CandlestickChart } from '@/components/charts/CandlestickChart'
import { NoteModal } from '@/components/notes/NoteModal'
import { NotesList } from '@/components/notes/NotesList'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Plus,
  TrendingUp,
  TrendingDown,
  BarChart2,
  DollarSign,
  Activity,
} from 'lucide-react'
import Link from 'next/link'
import { subDays, subMonths, subYears, format } from 'date-fns'
import type { Note } from '@/lib/types'

type TimeRange = '1W' | '1M' | '3M' | '1Y' | '5Y'

function getDateRange(range: TimeRange): { start: string; end: string } {
  const end = new Date()
  let start: Date

  switch (range) {
    case '1W': start = subDays(end, 7); break
    case '1M': start = subMonths(end, 1); break
    case '3M': start = subMonths(end, 3); break
    case '1Y': start = subYears(end, 1); break
    case '5Y': start = subYears(end, 5); break
  }

  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  }
}

interface StatCardProps {
  label: string
  value: string
  icon: React.ReactNode
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
      <div className="flex items-center gap-1.5 text-[#64748B]">
        {icon}
        <span className="font-mono text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <span className="font-mono text-sm font-semibold text-[#E2E8F0] tabular-nums">{value}</span>
    </div>
  )
}

export default function StockDetailPage() {
  const params = useParams()
  const ticker = (params.ticker as string).toUpperCase()
  const queryClient = useQueryClient()

  const [timeRange, setTimeRange] = useState<TimeRange>('3M')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)

  const dateRange = getDateRange(timeRange)

  // Data queries
  const { data: ohlcv, isLoading: chartLoading } = useQuery({
    queryKey: ['ohlcv', ticker, timeRange],
    queryFn: () => stocksApi.getOHLCV(ticker, dateRange.start, dateRange.end),
    staleTime: 5 * 60 * 1000,
  })

  const { data: companiesPage } = useQuery({
    queryKey: ['companies', ticker],
    queryFn: () => stocksApi.getCompanies(1, 1, ticker),
    staleTime: 5 * 60 * 1000,
  })

  const { data: notes } = useQuery({
    queryKey: ['notes', ticker],
    queryFn: () => notesApi.getNotes(ticker),
    staleTime: 30 * 1000,
  })

  const company = companiesPage?.items?.[0]

  // Mutations
  const createNote = useMutation({
    mutationFn: (data: { title: string; body: string }) =>
      notesApi.createNote({
        ticker,
        date: selectedDate ?? format(new Date(), 'yyyy-MM-dd'),
        ...data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', ticker] })
      toast.success('Note saved')
    },
    onError: () => toast.error('Failed to save note'),
  })

  const updateNote = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { title: string; body: string } }) =>
      notesApi.updateNote(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', ticker] })
      toast.success('Note updated')
    },
    onError: () => toast.error('Failed to update note'),
  })

  const deleteNote = useMutation({
    mutationFn: notesApi.deleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', ticker] })
      toast.success('Note deleted')
    },
    onError: () => toast.error('Failed to delete note'),
  })

  const handleDateClick = useCallback((date: string) => {
    setSelectedDate(date)
    setNoteModalOpen(true)
    setEditingNote(null)
  }, [])

  const handleEditNote = useCallback((note: Note) => {
    setEditingNote(note)
    setSelectedDate(note.date)
    setNoteModalOpen(true)
  }, [])

  const handleSaveNote = async (data: { title: string; body: string }) => {
    if (editingNote) {
      await updateNote.mutateAsync({ id: editingNote.id, data })
    } else {
      await createNote.mutateAsync(data)
    }
  }

  // Latest OHLCV for stats
  const latest = ohlcv?.[ohlcv.length - 1]
  const prev = ohlcv?.[ohlcv.length - 2]

  const pct = company?.price_change_pct ?? 0
  const isGain = pct >= 0

  const statsIcons = {
    Open: <DollarSign className="h-3 w-3" />,
    High: <TrendingUp className="h-3 w-3" />,
    Low: <TrendingDown className="h-3 w-3" />,
    Volume: <BarChart2 className="h-3 w-3" />,
    'Mkt Cap': <Activity className="h-3 w-3" />,
  } as Record<string, React.ReactNode>

  const stats = latest ? [
    { label: 'Open', value: formatPrice(latest.open) },
    { label: 'High', value: formatPrice(latest.high) },
    { label: 'Low', value: formatPrice(latest.low) },
    { label: 'Volume', value: formatVolume(latest.volume) },
    { label: 'Mkt Cap', value: company?.market_cap != null ? formatMarketCap(company.market_cap) : '—' },
    { label: 'Prev Close', value: prev ? formatPrice(prev.close) : '—' },
  ] : []

  const timeRanges: TimeRange[] = ['1W', '1M', '3M', '1Y', '5Y']

  return (
    <div className="space-y-4">
      {/* Back nav */}
      <Link
        href="/explorer"
        className="inline-flex items-center gap-1.5 text-xs font-mono text-[#64748B] hover:text-amber transition-colors"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to Explorer
      </Link>

      <div className="flex gap-6" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {/* Left: Chart Panel */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Stock header */}
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start justify-between"
          >
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="font-syne text-3xl font-bold text-[#E2E8F0]">{ticker}</h1>
                {company?.sector && (
                  <Badge variant="sector">{company.sector}</Badge>
                )}
              </div>
              <p className="font-mono text-sm text-[#64748B]">
                {company?.name ?? ''}
              </p>
            </div>

            <div className="text-right">
              <div className="font-mono text-2xl font-bold text-[#E2E8F0] tabular-nums">
                {company?.latest_price != null ? formatPrice(company.latest_price) : '—'}
              </div>
              <div className={`flex items-center justify-end gap-1 text-sm font-mono font-semibold ${isGain ? 'text-gain' : 'text-loss'}`}>
                {isGain ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {isGain ? '+' : ''}{(company?.price_change ?? 0) >= 0 ? '' : ''}{company?.price_change != null ? formatPrice(Math.abs(company.price_change)) : '—'}
                {' '}({isGain ? '+' : ''}{pct.toFixed(2)}%)
              </div>
            </div>
          </motion.div>

          {/* Time range tabs */}
          <div className="flex items-center gap-1">
            {timeRanges.map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`
                  px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all
                  ${timeRange === range
                    ? 'bg-amber/15 text-amber border border-amber/30'
                    : 'text-[#64748B] hover:text-[#E2E8F0] border border-transparent hover:border-[rgba(255,255,255,0.08)]'
                  }
                `}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Chart */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0F0F11] p-4"
          >
            {chartLoading ? (
              <div className="h-[400px] flex items-center justify-center">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-8 bg-amber/30 rounded animate-pulse" />
                  <div className="w-1 h-10 bg-amber/50 rounded animate-pulse" style={{ animationDelay: '0.1s' }} />
                  <div className="w-1 h-6 bg-amber/40 rounded animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <span className="font-mono text-xs text-[#64748B] ml-2">Loading chart data...</span>
                </div>
              </div>
            ) : ohlcv && ohlcv.length > 0 ? (
              <CandlestickChart
                data={ohlcv}
                notes={notes ?? []}
                onDateClick={handleDateClick}
                height={400}
              />
            ) : (
              <div className="h-[400px] flex items-center justify-center">
                <div className="text-center">
                  <BarChart2 className="h-10 w-10 text-[#2A2A2E] mx-auto mb-3" />
                  <p className="font-mono text-sm text-[#64748B]">No chart data available</p>
                  <p className="font-mono text-xs text-[#64748B] mt-1">Try selecting a different time range</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Stats grid */}
          {stats.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-3 sm:grid-cols-6 gap-2"
            >
              {stats.map((stat) => (
                <StatCard
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                  icon={statsIcons[stat.label] ?? <Activity className="h-3 w-3" />}
                />
              ))}
            </motion.div>
          )}
        </div>

        {/* Right: Notes Panel */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="w-72 flex-shrink-0 flex flex-col"
        >
          <div className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0F0F11] flex flex-col h-full">
            {/* Notes header */}
            <div className="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.06)]">
              <div className="flex items-center gap-2">
                <h2 className="font-syne text-sm font-bold text-[#E2E8F0] tracking-wider uppercase">
                  Notes
                </h2>
                {notes && notes.length > 0 && (
                  <span className="bg-amber/15 text-amber text-[10px] font-mono px-1.5 py-0.5 rounded-full border border-amber/20">
                    {notes.length}
                  </span>
                )}
              </div>
              <Button
                variant="amber"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => {
                  setEditingNote(null)
                  setSelectedDate(format(new Date(), 'yyyy-MM-dd'))
                  setNoteModalOpen(true)
                }}
              >
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </div>

            {/* Click hint */}
            {(!notes || notes.length === 0) && (
              <div className="px-4 pt-3">
                <p className="text-[10px] font-mono text-[#64748B] bg-[rgba(240,180,41,0.05)] border border-[rgba(240,180,41,0.1)] rounded p-2">
                  Click any date on the chart to pin a research note.
                </p>
              </div>
            )}

            {/* Notes list */}
            <ScrollArea className="flex-1 p-4">
              <NotesList
                notes={notes ?? []}
                onEdit={handleEditNote}
                onDelete={(id) => deleteNote.mutate(id)}
                onNoteClick={(date) => setSelectedDate(date)}
                activeDate={selectedDate ?? undefined}
              />
            </ScrollArea>
          </div>
        </motion.div>
      </div>

      {/* Note modal */}
      <NoteModal
        open={noteModalOpen}
        onClose={() => {
          setNoteModalOpen(false)
          setEditingNote(null)
        }}
        ticker={ticker}
        date={selectedDate ?? format(new Date(), 'yyyy-MM-dd')}
        note={editingNote ?? undefined}
        onSave={handleSaveNote}
      />
    </div>
  )
}
