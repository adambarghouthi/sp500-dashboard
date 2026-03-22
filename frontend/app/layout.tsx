import type { Metadata } from 'next'
import { Syne, DM_Mono } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { TickerTape } from '@/components/layout/TickerTape'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from 'sonner'

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-syne',
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-dm-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'S&P 500 Financial Dashboard',
  description: 'Real-time S&P 500 market data, charts, and AI analysis. Educational purposes only.',
  keywords: ['S&P 500', 'stocks', 'financial dashboard', 'market data'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${syne.variable} ${dmMono.variable}`}>
      <body className="min-h-screen bg-[#0A0A0C] text-[#E2E8F0] antialiased">
        <QueryProvider>
          <AppShell>
            <TickerTape />
            <div className="pt-7">
              <Navbar />
              <main className="mx-auto max-w-[1600px] px-6 py-6">
                {children}
              </main>
            </div>
          </AppShell>
          <Toaster
            theme="dark"
            toastOptions={{
              style: {
                background: '#0F0F11',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#E2E8F0',
                fontFamily: 'DM Mono, monospace',
                fontSize: '13px',
              },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  )
}
