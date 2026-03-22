'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table'
import { stocksApi } from '@/lib/api'
import { formatPrice, formatVolume, formatMarketCap, cn } from '@/lib/utils'
import type { Company } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { motion } from 'framer-motion'
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'

const PER_PAGE = 20

const SP500_SECTORS = [
  'Communication Services',
  'Consumer Discretionary',
  'Consumer Staples',
  'Energy',
  'Financials',
  'Health Care',
  'Industrials',
  'Information Technology',
  'Materials',
  'Real Estate',
  'Utilities',
]

const columnHelper = createColumnHelper<Company>()

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ChevronUp className="h-3 w-3 text-amber ml-1 flex-shrink-0" />
  if (sorted === 'desc') return <ChevronDown className="h-3 w-3 text-amber ml-1 flex-shrink-0" />
  return <ChevronsUpDown className="h-3 w-3 text-[#64748B] ml-1 flex-shrink-0 opacity-0 group-hover:opacity-100" />
}

export default function ExplorerPage() {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])
  const [searchInput, setSearchInput] = useState('')
  const [sectorFilter, setSectorFilter] = useState('')
  const [page, setPage] = useState(1)

  const search = useDebounce(searchInput, 300)

  const sortBy = sorting[0]?.id ?? 'ticker'
  const sortDir = sorting[0]?.desc ? 'desc' : 'asc'

  const handleSearch = useCallback((value: string) => {
    setSearchInput(value)
    setPage(1)
    setSorting([])
  }, [])

  const handleSector = useCallback((sector: string) => {
    setSectorFilter(sector)
    setPage(1)
    setSorting([])
  }, [])

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['companies', page, search, sectorFilter, sortBy, sortDir],
    queryFn: () => stocksApi.getCompanies(page, PER_PAGE, search, sectorFilter, sortBy, sortDir),
    staleTime: 60 * 1000,
    // Only keep previous data during page navigation, not filter/sort changes
    placeholderData: (prev, prevQuery) => {
      const prevKey = prevQuery?.queryKey as unknown[]
      if (!prevKey) return undefined
      // Same filter/sort, different page → smooth transition
      const sameFilters = prevKey[2] === search && prevKey[3] === sectorFilter && prevKey[4] === sortBy && prevKey[5] === sortDir
      return sameFilters ? prev : undefined
    },
  })

  const companies = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  // Numeric sorts only work globally when dataset is small enough (server fetches all)
  const GLOBAL_SORT_LIMIT = 150
  const canSortNumeric = total <= GLOBAL_SORT_LIMIT || total === 0
  const NUMERIC_COLS = new Set(['latest_price', 'price_change_pct', 'price_change', 'volume', 'market_cap'])

  const columns = useMemo(() => [
    columnHelper.accessor('ticker', {
      header: 'Ticker',
      cell: (info) => (
        <span className="font-syne font-bold text-[#E2E8F0]">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('name', {
      header: 'Company',
      cell: (info) => (
        <span className="text-[#A0A0A8] font-mono text-xs max-w-[200px] block truncate">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('sector', {
      header: 'Sector',
      cell: (info) => info.getValue() ? (
        <Badge variant="sector" className="text-[10px]">
          {info.getValue()}
        </Badge>
      ) : <span className="text-[#64748B]">—</span>,
    }),
    columnHelper.accessor('latest_price', {
      header: 'Price',
      cell: (info) => {
        const v = info.getValue()
        return (
          <span className="font-mono tabular-nums text-[#E2E8F0]">
            {v != null ? formatPrice(v) : '—'}
          </span>
        )
      },
    }),
    columnHelper.accessor('price_change_pct', {
      header: '1D Change',
      cell: (info) => {
        const v = info.getValue()
        if (v == null) return <span className="text-[#64748B]">—</span>
        const isGain = v >= 0
        return (
          <span className={cn(
            'font-mono tabular-nums font-semibold text-sm',
            isGain ? 'text-gain' : 'text-loss'
          )}>
            {isGain ? '+' : ''}{v.toFixed(2)}%
          </span>
        )
      },
    }),
    columnHelper.accessor('price_change', {
      header: '1D $',
      cell: (info) => {
        const v = info.getValue()
        if (v == null) return <span className="text-[#64748B]">—</span>
        const isGain = v >= 0
        return (
          <span className={cn('font-mono tabular-nums text-xs', isGain ? 'text-gain' : 'text-loss')}>
            {isGain ? '+' : ''}{formatPrice(v)}
          </span>
        )
      },
    }),
    columnHelper.accessor('volume', {
      header: 'Volume',
      cell: (info) => {
        const v = info.getValue()
        return (
          <span className="font-mono tabular-nums text-[#64748B] text-xs">
            {v != null ? formatVolume(v) : '—'}
          </span>
        )
      },
    }),
    columnHelper.accessor('market_cap', {
      header: 'Mkt Cap',
      cell: (info) => {
        const v = info.getValue()
        return (
          <span className="font-mono tabular-nums text-[#A0A0A8] text-xs">
            {v != null ? formatMarketCap(v) : '—'}
          </span>
        )
      },
    }),
  ], [])

  const table = useReactTable({
    data: companies,
    columns,
    state: { sorting },
    onSortingChange: (updater) => {
      setSorting(updater)
      setPage(1)
    },
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    // Disable numeric column sorts when dataset is too large for global sort
    enableSortingRemoval: true,
    getColumnCanSort: (col) => {
      if (NUMERIC_COLS.has(col.id)) return canSortNumeric
      return true
    },
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="font-syne text-2xl font-bold text-[#E2E8F0] tracking-tight">
            MARKET EXPLORER
          </h1>
          <p className="font-mono text-xs text-[#64748B] mt-0.5">
            {isLoading ? 'Loading...' : `${total.toLocaleString()} companies`}
            {!canSortNumeric && !isLoading && (
              <span className="ml-2 text-[#64748B]/60">· filter by sector to sort by price/volume</span>
            )}
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-row gap-3 min-w-0"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#64748B]" />
          <Input
            placeholder="Search companies, tickers..."
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <Filter className="h-3.5 w-3.5 text-[#64748B] flex-shrink-0" />
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            <button
              onClick={() => handleSector('')}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-mono transition-all whitespace-nowrap flex-shrink-0',
                sectorFilter === ''
                  ? 'bg-amber/15 text-amber border border-amber/30'
                  : 'bg-[rgba(255,255,255,0.03)] text-[#64748B] border border-[rgba(255,255,255,0.06)] hover:text-[#E2E8F0]'
              )}
            >
              All
            </button>
            {SP500_SECTORS.map((sector) => (
              <button
                key={sector}
                onClick={() => handleSector(sector)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-mono transition-all whitespace-nowrap flex-shrink-0',
                  sectorFilter === sector
                    ? 'bg-amber/15 text-amber border border-amber/30'
                    : 'bg-[rgba(255,255,255,0.03)] text-[#64748B] border border-[rgba(255,255,255,0.06)] hover:text-[#E2E8F0]'
                )}
              >
                {sector}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card className="overflow-hidden relative">
          {isFetching && companies.length > 0 && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber/20 z-10">
              <div className="h-full bg-amber animate-pulse w-full" />
            </div>
          )}
          {(isLoading || isFetching) && companies.length === 0 ? (
            <div className="p-8 space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-10 rounded bg-[rgba(255,255,255,0.03)] animate-pulse" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const canSort = header.column.getCanSort()
                      const isNumeric = NUMERIC_COLS.has(header.column.id)
                      const sortDisabledReason = isNumeric && !canSortNumeric
                        ? 'Filter by sector or search to enable sorting'
                        : undefined
                      return (
                      <TableHead
                        key={header.id}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                        title={sortDisabledReason}
                        className={cn(
                          'select-none',
                          canSort && 'cursor-pointer hover:text-[#E2E8F0]',
                          sortDisabledReason && 'cursor-default opacity-50'
                        )}
                      >
                        <div className="flex items-center group">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            <SortIcon sorted={header.column.getIsSorted()} />
                          )}
                        </div>
                      </TableHead>
                    )})}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center py-8 text-[#64748B]">
                      No companies found matching your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      onClick={() => router.push(`/stock/${row.original.ticker}`)}
                      className="cursor-pointer"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </Card>
      </motion.div>

      {/* Pagination */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex items-center justify-between"
      >
        <span className="font-mono text-xs text-[#64748B]">
          Page {page} of {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isLoading}
            className="text-xs h-8"
          >
            <ChevronLeft className="h-3.5 w-3.5 mr-1" />
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isLoading}
            className="text-xs h-8"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
