'use client'

import { useEffect, useState } from 'react'
import { createPriceStream } from '@/lib/ws'
import type { LivePrice } from '@/lib/types'

export function useLivePrices(tickers: string[]): Record<string, LivePrice> {
  const [prices, setPrices] = useState<Record<string, LivePrice>>({})
  // Stable key so useEffect only re-runs when the actual ticker list changes
  const tickersKey = [...tickers].sort().join(',')

  useEffect(() => {
    if (tickers.length === 0) return
    const cleanup = createPriceStream(tickers, (data) => {
      setPrices((prev) => ({ ...prev, [data.id.toUpperCase()]: data }))
    })
    return cleanup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickersKey])

  return prices
}
