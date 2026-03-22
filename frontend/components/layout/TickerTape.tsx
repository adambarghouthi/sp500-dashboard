'use client'

import { useQuery } from '@tanstack/react-query'
import { stocksApi } from '@/lib/api'
import type { Company } from '@/lib/types'
import { formatPrice } from '@/lib/utils'

function TickerItem({ company }: { company: Company }) {
  const pct = company.price_change_pct
  const isGain = (pct ?? 0) >= 0
  const price = company.latest_price

  return (
    <span className="inline-flex items-center gap-1.5 px-4 border-r border-[rgba(255,255,255,0.06)]">
      <span className="text-[#E2E8F0] font-semibold">{company.ticker}</span>
      {price != null && (
        <span className="text-[#A0A0A8]">{formatPrice(price)}</span>
      )}
      {pct != null && (
        <span className={isGain ? 'text-gain' : 'text-loss'}>
          {isGain ? '+' : ''}{pct.toFixed(2)}%
        </span>
      )}
    </span>
  )
}

export function TickerTape() {
  const { data } = useQuery({
    queryKey: ['companies-ticker'],
    queryFn: () => stocksApi.getCompanies(1, 50),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
  })

  const items = data?.items ?? []

  if (items.length === 0) {
    return (
      <div className="h-7 w-full bg-[#0C0C0F] border-b border-[rgba(255,255,255,0.06)]" />
    )
  }

  // Duplicate for seamless loop
  const doubled = [...items, ...items]

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-7 bg-[#0C0C0F] border-b border-[rgba(255,255,255,0.06)] overflow-hidden flex items-center">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#0C0C0F] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#0C0C0F] to-transparent z-10 pointer-events-none" />

      <div className="ticker-scroll flex items-center whitespace-nowrap text-xs font-mono">
        {doubled.map((company, idx) => (
          <TickerItem key={`${company.ticker}-${idx}`} company={company} />
        ))}
      </div>
    </div>
  )
}
