'use client'

import { useQuery } from '@tanstack/react-query'
import { stocksApi } from '@/lib/api'
import { formatPrice, formatMarketCap, isMarketOpen } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { TrendingUp, TrendingDown, Activity, BarChart2, Clock } from 'lucide-react'
import type { Company, LivePrice } from '@/lib/types'
import { useLivePrices } from '@/hooks/useLivePrices'

function CompanyCard({
  company,
  type,
  livePrice,
}: {
  company: Company
  type: 'gainer' | 'loser'
  livePrice?: LivePrice
}) {
  const isGain = type === 'gainer'
  const pct = livePrice?.changePercent ?? company.price_change_pct ?? 0
  const change = livePrice?.change ?? company.price_change ?? 0
  const displayPrice = livePrice?.price ?? company.latest_price
  const isLive = livePrice?.marketHours === 'REGULAR_MARKET'

  return (
    <Link href={`/stock/${company.ticker}`}>
      <motion.div
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.15 }}
        className={`
          group relative rounded-lg border bg-[#0F0F11] p-4 cursor-pointer
          transition-all duration-200
          ${isGain
            ? 'border-[rgba(22,163,74,0.2)] hover:border-[rgba(22,163,74,0.4)] hover:shadow-[0_0_20px_-5px_rgba(22,163,74,0.15)]'
            : 'border-[rgba(220,38,38,0.2)] hover:border-[rgba(220,38,38,0.4)] hover:shadow-[0_0_20px_-5px_rgba(220,38,38,0.15)]'
          }
        `}
      >
        {/* Colored left border accent */}
        <div className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full ${isGain ? 'bg-gain' : 'bg-loss'}`} />

        <div className="pl-2">
          <div className="flex items-start justify-between mb-1">
            <div>
              <span className="font-syne font-bold text-[#E2E8F0] text-sm">{company.ticker}</span>
              {company.sector && (
                <Badge variant="neutral" className="ml-2 text-[10px] py-0 h-4">
                  {company.sector.split(' ')[0]}
                </Badge>
              )}
            </div>
            <div className={`flex items-center gap-1 text-xs font-mono font-semibold ${isGain ? 'text-gain' : 'text-loss'}`}>
              {isGain ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {isGain ? '+' : ''}{pct.toFixed(2)}%
            </div>
          </div>
          <p className="text-[11px] text-[#64748B] font-mono truncate mb-2" title={company.name}>
            {livePrice?.shortName ?? company.name}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-[#E2E8F0] tabular-nums">
                {displayPrice != null ? formatPrice(displayPrice) : '—'}
              </span>
              {isLive && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gain opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-gain" />
                </span>
              )}
            </div>
            <span className={`font-mono text-xs ${isGain ? 'text-gain' : 'text-loss'}`}>
              {isGain ? '+' : ''}{change >= 0 ? '' : ''}{formatPrice(Math.abs(change))}
            </span>
          </div>
          {company.market_cap != null && (
            <p className="text-[10px] text-[#64748B] font-mono mt-1">
              Mkt Cap: {formatMarketCap(company.market_cap)}
            </p>
          )}
        </div>
      </motion.div>
    </Link>
  )
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="bg-[#0F0F11] border border-[rgba(240,180,41,0.3)] rounded-lg px-3 py-2">
      <p className="font-mono text-xs text-[#64748B] mb-1">{label}</p>
      <p className="font-mono text-sm font-semibold text-amber">
        {payload[0].value.toLocaleString('en-US', { maximumFractionDigits: 2 })}
      </p>
    </div>
  )
}

export default function DashboardPage() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['market-summary'],
    queryFn: stocksApi.getMarketSummary,
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000,
  })

  const gainers = summary?.top_gainers ?? []
  const losers = summary?.top_losers ?? []
  const watchTickers = Array.from(new Set([...gainers, ...losers].map((c) => c.ticker)))
  const livePrices = useLivePrices(watchTickers)

  const marketOpen = isMarketOpen()

  const indexData = summary?.index_data ?? []
  const firstVal = indexData[0]?.value ?? 0
  const lastVal = indexData[indexData.length - 1]?.value ?? firstVal
  const indexChange = lastVal - firstVal
  const indexChangePct = firstVal > 0 ? (indexChange / firstVal) * 100 : 0
  const isIndexGain = indexChange >= 0

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="font-syne text-2xl font-bold text-[#E2E8F0] tracking-tight">
            S&P 500 DASHBOARD
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Clock className="h-3 w-3 text-[#64748B]" />
            <span className="font-mono text-xs text-[#64748B]">{dateStr}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {marketOpen ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(22,163,74,0.3)] bg-[rgba(22,163,74,0.08)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gain opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-gain" />
              </span>
              <span className="text-xs font-mono text-gain font-semibold">MARKET OPEN</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(100,116,139,0.2)] bg-[rgba(100,116,139,0.06)]">
              <span className="h-2 w-2 rounded-full bg-[#64748B]" />
              <span className="text-xs font-mono text-[#64748B]">MARKET CLOSED</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Index Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="chart-glow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4 text-amber" />
                <CardTitle className="text-sm tracking-widest uppercase">S&P 500 Index</CardTitle>
              </div>
              {!isLoading && indexData.length > 0 && (
                <div className="flex items-center gap-4">
                  <span className="font-mono text-lg font-bold text-[#E2E8F0] tabular-nums">
                    {lastVal.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </span>
                  <span className={`font-mono text-sm font-semibold ${isIndexGain ? 'text-gain' : 'text-loss'}`}>
                    {isIndexGain ? '+' : ''}{indexChange.toFixed(2)} ({isIndexGain ? '+' : ''}{indexChangePct.toFixed(2)}%)
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[280px] flex items-center justify-center">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-amber/30 rounded animate-pulse" />
                  <div className="w-1 h-8 bg-amber/50 rounded animate-pulse" style={{ animationDelay: '0.1s' }} />
                  <div className="w-1 h-5 bg-amber/40 rounded animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <span className="font-mono text-xs text-[#64748B] ml-2">Loading market data...</span>
                </div>
              </div>
            ) : indexData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={indexData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F0B429" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#F0B429" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis
                    dataKey="time"
                    tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'DM Mono' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    tickFormatter={(val: string) => {
                      const d = new Date(val)
                      if (isNaN(d.getTime())) return val
                      // Intraday: show HH:MM, daily: show MMM DD
                      const isIntraday = val.includes('T')
                      return isIntraday
                        ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
                        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }}
                  />
                  <YAxis
                    tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'DM Mono' }}
                    tickLine={false}
                    axisLine={false}
                    domain={['auto', 'auto']}
                    tickFormatter={(v) => v.toLocaleString()}
                    width={70}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={firstVal} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={isIndexGain ? '#F0B429' : '#DC2626'}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#F0B429', strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center">
                <div className="text-center">
                  <BarChart2 className="h-8 w-8 text-[#64748B] mx-auto mb-2" />
                  <p className="font-mono text-sm text-[#64748B]">No index data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Gainers & Losers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Gainers */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-gain" />
                <CardTitle className="text-sm tracking-widest uppercase text-gain">
                  Top Gainers
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-lg bg-[rgba(255,255,255,0.03)] animate-pulse" />
                ))
              ) : summary?.top_gainers?.length ? (
                summary.top_gainers.map((company) => (
                  <CompanyCard key={company.ticker} company={company} type="gainer" livePrice={livePrices[company.ticker]} />
                ))
              ) : (
                <p className="font-mono text-sm text-[#64748B] text-center py-4">No data available</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Losers */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-loss" />
                <CardTitle className="text-sm tracking-widest uppercase text-loss">
                  Top Losers
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-lg bg-[rgba(255,255,255,0.03)] animate-pulse" />
                ))
              ) : summary?.top_losers?.length ? (
                summary.top_losers.map((company) => (
                  <CompanyCard key={company.ticker} company={company} type="loser" livePrice={livePrices[company.ticker]} />
                ))
              ) : (
                <p className="font-mono text-sm text-[#64748B] text-center py-4">No data available</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
