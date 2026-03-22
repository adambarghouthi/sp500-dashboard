'use client'

import { useEffect, useRef, useCallback } from 'react'
import type { OHLCVData, Note } from '@/lib/types'

interface CandlestickChartProps {
  data: OHLCVData[]
  notes: Note[]
  onDateClick?: (date: string) => void
  height?: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IChartApi = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ISeriesApi = any

export function CandlestickChart({
  data,
  notes,
  onDateClick,
  height = 400,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi>(null)
  const candleSeriesRef = useRef<ISeriesApi>(null)
  const volumeSeriesRef = useRef<ISeriesApi>(null)
  const cleanupRef = useRef<(() => void) | undefined>(undefined)

  const initChart = useCallback(async () => {
    if (!containerRef.current) return

    const { createChart, CrosshairMode, LineStyle } = await import('lightweight-charts')

    if (chartRef.current) {
      chartRef.current.remove()
      chartRef.current = null
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { color: 'transparent' },
        textColor: '#64748B',
        fontFamily: "'DM Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)', style: LineStyle.Dotted },
        horzLines: { color: 'rgba(255,255,255,0.04)', style: LineStyle.Dotted },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(240,180,41,0.4)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#F0B429',
        },
        horzLine: {
          color: 'rgba(240,180,41,0.4)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#F0B429',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        textColor: '#64748B',
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        timeVisible: true,
        secondsVisible: false,
      },
    })

    chartRef.current = chart

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#16A34A',
      downColor: '#DC2626',
      borderUpColor: '#16A34A',
      borderDownColor: '#DC2626',
      wickUpColor: '#16A34A',
      wickDownColor: '#DC2626',
      priceLineColor: 'rgba(240,180,41,0.5)',
      priceLineWidth: 1,
    })
    candleSeriesRef.current = candleSeries

    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    })
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    })
    volumeSeriesRef.current = volumeSeries

    if (data.length > 0) {
      const candleData = data.map((d) => ({
        time: d.date,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }))

      const volumeData = data.map((d) => ({
        time: d.date,
        value: d.volume,
        color: d.close >= d.open
          ? 'rgba(22,163,74,0.3)'
          : 'rgba(220,38,38,0.3)',
      }))

      candleSeries.setData(candleData)
      volumeSeries.setData(volumeData)

      if (notes.length > 0) {
        const noteDates = new Set(notes.map((n) => n.date))
        const markers = Array.from(noteDates)
          .map((date) => ({
            time: date,
            position: 'aboveBar' as const,
            color: '#F0B429',
            shape: 'circle' as const,
            text: '★',
            size: 1,
          }))
          .sort((a, b) => a.time.localeCompare(b.time))

        candleSeries.setMarkers(markers)
      }

      chart.timeScale().fitContent()
    }

    if (onDateClick) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chart.subscribeClick((param: any) => {
        if (param.time) {
          onDateClick(String(param.time))
        }
      })
    }

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        })
      }
    })

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    cleanupRef.current = () => {
      resizeObserver.disconnect()
    }
  }, [data, notes, height, onDateClick])

  useEffect(() => {
    initChart()

    return () => {
      cleanupRef.current?.()
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, notes])

  return (
    <div
      ref={containerRef}
      className="w-full chart-glow rounded-lg overflow-hidden"
      style={{ height }}
    />
  )
}
