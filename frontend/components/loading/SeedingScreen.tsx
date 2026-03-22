'use client'

import { motion } from 'framer-motion'

interface SeedingScreenProps {
  progress: number
  message: string
}

export function SeedingScreen({ progress, message }: SeedingScreenProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0A0C] grid-pattern overflow-hidden">
      {/* Ambient amber glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-amber/5 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-xl w-full px-8">
        {/* Logo / Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-2 h-2 rounded-full bg-amber animate-ping" />
            <span className="text-xs font-mono text-amber tracking-[0.3em] uppercase">
              Initializing
            </span>
            <div className="w-2 h-2 rounded-full bg-amber animate-ping" style={{ animationDelay: '0.3s' }} />
          </div>
          <h1 className="font-syne text-4xl font-bold text-[#E2E8F0] tracking-tight mb-2">
            S&P 500
          </h1>
          <h2 className="font-syne text-2xl font-semibold text-amber tracking-widest">
            FINANCIAL DASHBOARD
          </h2>
        </motion.div>

        {/* Progress Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="w-full mb-8"
        >
          {/* Progress bar container */}
          <div className="relative h-1.5 w-full bg-[#1A1A1E] rounded-full overflow-hidden mb-4">
            {/* Glow behind bar */}
            <div
              className="absolute inset-y-0 left-0 bg-amber/20 blur-sm transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
            {/* Actual bar */}
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full progress-shimmer"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-[#64748B]">{message}</span>
            <span className="font-mono text-sm font-semibold text-amber tabular-nums">
              {Math.round(progress)}%
            </span>
          </div>
        </motion.div>

        {/* Loading indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-6 mb-10"
        >
          {[
            { label: 'Companies', done: progress > 20 },
            { label: 'Price Data', done: progress > 50 },
            { label: 'Market Stats', done: progress > 80 },
            { label: 'Ready', done: progress >= 100 },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div
                className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${
                  item.done ? 'bg-gain' : 'bg-[#2A2A2E]'
                }`}
              />
              <span
                className={`font-mono text-xs transition-colors duration-500 ${
                  item.done ? 'text-[#E2E8F0]' : 'text-[#64748B]'
                }`}
              >
                {item.label}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Disclaimer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center font-mono text-[10px] text-[#64748B] leading-relaxed max-w-sm border border-[rgba(255,255,255,0.05)] rounded-lg p-3 bg-[rgba(255,255,255,0.02)]"
        >
          Data sourced from Yahoo Finance via yfinance. For educational and research
          purposes only. Not financial advice. Past performance does not guarantee
          future results.
        </motion.p>
      </div>
    </div>
  )
}
