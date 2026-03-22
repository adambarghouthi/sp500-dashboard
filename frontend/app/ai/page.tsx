'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { aiApi } from '@/lib/api'
import type { AIMessage } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Send, Bot, User, Sparkles, BarChart2, TrendingUp } from 'lucide-react'

const SUGGESTED_QUESTIONS = [
  'Which companies had the steepest decline during COVID?',
  'What are the top 10 companies by market cap?',
  'Show me tech sector performance in 2023',
  'Compare AAPL, MSFT, and GOOGL over the last year',
  'What are the highest volume stocks this week?',
  'Which sectors have the best 1-day performance?',
]

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-amber typing-dot" />
        <div className="w-1.5 h-1.5 rounded-full bg-amber typing-dot" />
        <div className="w-1.5 h-1.5 rounded-full bg-amber typing-dot" />
      </div>
      <span className="font-mono text-xs text-[#64748B]">AI Analyst is thinking...</span>
    </div>
  )
}

function MessageBubble({ message }: { message: AIMessage }) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-end gap-3"
      >
        <div className="max-w-[75%] px-4 py-3 rounded-2xl rounded-tr-sm bg-amber text-[#0A0A0C] font-mono text-sm leading-relaxed">
          {message.content}
        </div>
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-amber/20 border border-amber/30 flex items-center justify-center mt-0.5">
          <User className="h-3.5 w-3.5 text-amber" />
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3"
    >
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[rgba(240,180,41,0.1)] border border-amber/20 flex items-center justify-center mt-0.5">
        <Bot className="h-3.5 w-3.5 text-amber" />
      </div>
      <div className="max-w-[85%] space-y-3">
        {message.type === 'spec' && message.spec ? (
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0F0F11] p-4">
            <SpecRenderer spec={message.spec} />
          </div>
        ) : (
          <div className="px-4 py-3 rounded-2xl rounded-tl-sm border border-[rgba(255,255,255,0.08)] bg-[#0F0F11] font-mono text-sm text-[#E2E8F0] leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// Lazy-load the json-render Renderer to avoid SSR issues
function SpecRenderer({ spec }: { spec: object }) {
  // Wrap in object to prevent React from treating the component as an updater fn
  const [loaded, setLoaded] = useState<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Component: React.ComponentType<any>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Provider: React.ComponentType<any>
    registry: object
  } | null>(null)

  useEffect(() => {
    Promise.all([
      import('@json-render/react'),
      import('@/lib/json-render/registry'),
    ]).then(([mod, { registry: reg }]) => {
      setLoaded({ Component: mod.Renderer, Provider: mod.JSONUIProvider, registry: reg })
    }).catch(console.error)
  }, [])

  if (!loaded) {
    return (
      <div className="flex items-center gap-2 py-2">
        <div className="w-1 h-4 bg-amber/30 rounded animate-pulse" />
        <span className="font-mono text-xs text-[#64748B]">Loading visualization...</span>
      </div>
    )
  }

  const { Component, Provider, registry } = loaded
  return (
    <Provider registry={registry}>
      <Component spec={spec} registry={registry} />
    </Provider>
  )
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading, scrollToBottom])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMessage: AIMessage = { role: 'user', content: trimmed, type: 'text' }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const response = await aiApi.chat(
        newMessages.map(m => ({ role: m.role, content: m.content }))
      )

      const assistantMessage: AIMessage = {
        role: 'assistant',
        content: typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content),
        type: response.type,
        spec: response.type === 'spec' ? response.content as AIMessage['spec'] : undefined,
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      console.error(err)
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request. Please try again.',
          type: 'text',
        },
      ])
    } finally {
      setLoading(false)
    }
  }, [messages, loading])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const hasMessages = messages.length > 0

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 130px)' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-4 flex-shrink-0"
      >
        <div>
          <h1 className="font-syne text-2xl font-bold text-[#E2E8F0] tracking-tight flex items-center gap-3">
            <Bot className="h-6 w-6 text-amber" />
            AI ANALYST
          </h1>
          <p className="font-mono text-xs text-[#64748B] mt-0.5">
            Ask questions about S&P 500 companies and market data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-amber" />
          <Badge variant="default" className="text-[10px]">Powered by GPT-4o</Badge>
        </div>
      </motion.div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0F0F11] mb-3"
      >
        {!hasMessages ? (
          /* Welcome / Suggestions */
          <div className="h-full flex flex-col items-center justify-center p-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center mb-8"
            >
              <div className="w-14 h-14 rounded-full bg-amber/10 border border-amber/20 flex items-center justify-center mx-auto mb-4">
                <Bot className="h-7 w-7 text-amber" />
              </div>
              <h2 className="font-syne text-lg font-semibold text-[#E2E8F0] mb-2">
                Ask me anything about the market
              </h2>
              <p className="font-mono text-xs text-[#64748B] max-w-sm">
                I can analyze S&P 500 companies, generate charts, compare performance, and surface insights from your data.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <motion.button
                  key={q}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  onClick={() => sendMessage(q)}
                  className="text-left px-4 py-3 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] hover:border-amber/30 hover:bg-[rgba(240,180,41,0.04)] transition-all group"
                >
                  <div className="flex items-start gap-2">
                    {i % 2 === 0
                      ? <TrendingUp className="h-3.5 w-3.5 text-[#64748B] group-hover:text-amber mt-0.5 transition-colors flex-shrink-0" />
                      : <BarChart2 className="h-3.5 w-3.5 text-[#64748B] group-hover:text-amber mt-0.5 transition-colors flex-shrink-0" />
                    }
                    <span className="font-mono text-xs text-[#64748B] group-hover:text-[#E2E8F0] transition-colors leading-relaxed">
                      {q}
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <MessageBubble key={idx} message={msg} />
              ))}
            </AnimatePresence>
            {loading && <TypingIndicator />}
          </div>
        )}
      </div>

      {/* Input bar */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex-shrink-0 flex items-end gap-3"
      >
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about market trends, company performance, sector analysis..."
            disabled={loading}
            rows={1}
            className="w-full resize-none rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#0F0F11] px-4 py-3 pr-4 font-mono text-sm text-[#E2E8F0] placeholder-[#64748B] focus:outline-none focus:ring-1 focus:ring-amber focus:border-amber/50 disabled:opacity-50 transition-all"
            style={{ maxHeight: 120, lineHeight: '1.5' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = `${Math.min(target.scrollHeight, 120)}px`
            }}
          />
          <p className="absolute bottom-2 right-3 font-mono text-[10px] text-[#64748B] pointer-events-none">
            ↵ send
          </p>
        </div>
        <Button
          variant="amber"
          size="icon"
          className="h-11 w-11 rounded-xl flex-shrink-0"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
        >
          <Send className="h-4 w-4" />
        </Button>
      </motion.div>
    </div>
  )
}
