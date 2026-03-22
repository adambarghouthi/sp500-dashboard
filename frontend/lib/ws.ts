import type { LivePrice } from './types'

// In Docker: browser connects to published port (localhost:8000), not internal hostname
const WS_BASE =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_WS_URL ?? `ws://${window.location.hostname}:8000`)
    : 'ws://localhost:8000'

export function createPriceStream(
  tickers: string[],
  onMessage: (data: LivePrice) => void,
  onError?: (event: Event) => void
): () => void {
  if (tickers.length === 0) return () => {}

  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let closed = false

  function connect() {
    ws = new WebSocket(`${WS_BASE}/ws/prices`)

    ws.onopen = () => {
      ws!.send(JSON.stringify({ subscribe: tickers }))
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as LivePrice
        onMessage(data)
      } catch {
        // ignore malformed messages
      }
    }

    ws.onerror = onError ?? (() => {})

    ws.onclose = () => {
      if (!closed) {
        reconnectTimer = setTimeout(connect, 3000)
      }
    }
  }

  connect()

  return () => {
    closed = true
    if (reconnectTimer) clearTimeout(reconnectTimer)
    ws?.close()
  }
}
