'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isMarketOpen } from '@/lib/utils'

const navLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/explorer', label: 'Explorer' },
  { href: '/ai', label: 'AI Chat' },
  { href: '/notes', label: 'Notes' },
]

export function Navbar() {
  const pathname = usePathname()
  const marketOpen = isMarketOpen()

  return (
    <nav className="sticky top-[28px] z-40 w-full border-b border-[rgba(255,255,255,0.08)] bg-[#0A0A0C]/95 backdrop-blur-md">
      <div className="mx-auto max-w-[1600px] px-6 flex items-center justify-between h-14">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex items-center gap-1">
            <span className="w-1 h-4 bg-amber rounded-sm group-hover:h-5 transition-all duration-200" />
            <span className="w-1 h-3 bg-amber/60 rounded-sm" />
            <span className="w-1 h-2 bg-amber/30 rounded-sm" />
          </div>
          <span className="font-syne text-base font-bold text-amber tracking-wider">
            MARKET.WATCH
          </span>
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = link.href === '/'
              ? pathname === '/'
              : pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  px-4 py-2 rounded-md text-sm font-mono transition-all duration-150
                  ${isActive
                    ? 'text-amber bg-[rgba(240,180,41,0.08)] border border-[rgba(240,180,41,0.15)]'
                    : 'text-[#64748B] hover:text-[#E2E8F0] hover:bg-[rgba(255,255,255,0.04)]'
                  }
                `}
              >
                {link.label}
              </Link>
            )
          })}
        </div>

        {/* Market Status */}
        <div className="flex items-center gap-2">
          {marketOpen ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(22,163,74,0.3)] bg-[rgba(22,163,74,0.08)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gain opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-gain" />
              </span>
              <span className="text-xs font-mono font-semibold text-gain tracking-wider">OPEN</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(100,116,139,0.2)] bg-[rgba(100,116,139,0.06)]">
              <span className="h-2 w-2 rounded-full bg-[#64748B]" />
              <span className="text-xs font-mono text-[#64748B] tracking-wider">CLOSED</span>
            </div>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex items-center gap-1 px-4 pb-3 overflow-x-auto">
        {navLinks.map((link) => {
          const isActive = link.href === '/'
            ? pathname === '/'
            : pathname.startsWith(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`
                flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-mono transition-all
                ${isActive
                  ? 'text-amber bg-[rgba(240,180,41,0.08)] border border-[rgba(240,180,41,0.15)]'
                  : 'text-[#64748B] hover:text-[#E2E8F0]'
                }
              `}
            >
              {link.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
