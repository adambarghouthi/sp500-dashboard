'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { notesApi } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NoteModal } from '@/components/notes/NoteModal'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import type { Note } from '@/lib/types'
import { Search, StickyNote, Pencil, Trash2, ExternalLink } from 'lucide-react'

export default function NotesPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [tickerFilter, setTickerFilter] = useState('')
  const [editingNote, setEditingNote] = useState<Note | null>(null)

  const { data: notes, isLoading } = useQuery({
    queryKey: ['notes'],
    queryFn: () => notesApi.getNotes(),
    staleTime: 30 * 1000,
  })

  const updateNote = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { title: string; body: string } }) =>
      notesApi.updateNote(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      toast.success('Note updated')
    },
    onError: () => toast.error('Failed to update note'),
  })

  const deleteNote = useMutation({
    mutationFn: notesApi.deleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      toast.success('Note deleted')
    },
    onError: () => toast.error('Failed to delete note'),
  })

  const filteredNotes = useMemo(() => {
    if (!notes) return []
    return notes.filter((note) => {
      const matchesSearch =
        !search ||
        note.title.toLowerCase().includes(search.toLowerCase()) ||
        note.body.toLowerCase().includes(search.toLowerCase())
      const matchesTicker =
        !tickerFilter ||
        note.ticker.toLowerCase().includes(tickerFilter.toLowerCase())
      return matchesSearch && matchesTicker
    })
  }, [notes, search, tickerFilter])

  // Group notes by ticker
  const tickers = useMemo(() => {
    if (!notes) return []
    const unique = new Set(notes.map(n => n.ticker))
    return Array.from(unique).sort()
  }, [notes])

  const handleEditSave = async (data: { title: string; body: string }) => {
    if (!editingNote) return
    await updateNote.mutateAsync({ id: editingNote.id, data })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="font-syne text-2xl font-bold text-[#E2E8F0] tracking-tight">
            RESEARCH NOTES
          </h1>
          <p className="font-mono text-xs text-[#64748B] mt-0.5">
            {isLoading ? 'Loading...' : `${filteredNotes.length} note${filteredNotes.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#64748B]" />
          <Input
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>
        <Input
          placeholder="Filter by ticker..."
          value={tickerFilter}
          onChange={(e) => setTickerFilter(e.target.value.toUpperCase())}
          className="w-40 text-xs font-syne font-bold"
        />
      </motion.div>

      {/* Ticker quick filters */}
      {tickers.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex flex-wrap gap-1.5"
        >
          <button
            onClick={() => setTickerFilter('')}
            className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all ${
              !tickerFilter
                ? 'bg-amber/15 text-amber border border-amber/30'
                : 'text-[#64748B] border border-[rgba(255,255,255,0.06)] hover:text-[#E2E8F0]'
            }`}
          >
            All
          </button>
          {tickers.map((ticker) => (
            <button
              key={ticker}
              onClick={() => setTickerFilter(tickerFilter === ticker ? '' : ticker)}
              className={`px-2.5 py-1 rounded-md text-xs font-syne font-bold transition-all ${
                tickerFilter === ticker
                  ? 'bg-amber/15 text-amber border border-amber/30'
                  : 'text-[#64748B] border border-[rgba(255,255,255,0.06)] hover:text-[#E2E8F0]'
              }`}
            >
              {ticker}
            </button>
          ))}
        </motion.div>
      )}

      {/* Notes Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-lg bg-[rgba(255,255,255,0.03)] animate-pulse" />
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 gap-4"
        >
          <StickyNote className="h-10 w-10 text-[#2A2A2E]" />
          <div className="text-center">
            {notes?.length === 0 ? (
              <>
                <p className="font-syne text-base font-semibold text-[#E2E8F0] mb-1">
                  No notes yet
                </p>
                <p className="font-mono text-xs text-[#64748B] max-w-xs leading-relaxed">
                  Start by viewing a stock and adding observations.
                  Click on any date in the chart to pin a note.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 text-xs"
                  onClick={() => router.push('/explorer')}
                >
                  Browse Stocks
                </Button>
              </>
            ) : (
              <p className="font-mono text-sm text-[#64748B]">
                No notes match your filters.
              </p>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <AnimatePresence initial={false}>
            {filteredNotes.map((note) => (
              <motion.div
                key={note.id}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className="group relative rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#0F0F11] p-4 hover:border-amber/25 transition-all duration-200 cursor-pointer"
                onClick={() => router.push(`/stock/${note.ticker}`)}
              >
                {/* Amber left accent */}
                <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-amber" />

                <div className="pl-2">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-[10px] py-0 h-5">
                        {note.ticker}
                      </Badge>
                      <span className="font-mono text-[10px] text-[#64748B]">
                        {formatDate(note.date)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingNote(note)
                        }}
                        className="p-1.5 rounded text-[#64748B] hover:text-amber hover:bg-amber/10 transition-colors"
                        title="Edit note"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm('Delete this note?')) {
                            deleteNote.mutate(note.id)
                          }
                        }}
                        className="p-1.5 rounded text-[#64748B] hover:text-loss hover:bg-loss/10 transition-colors"
                        title="Delete note"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/stock/${note.ticker}`)
                        }}
                        className="p-1.5 rounded text-[#64748B] hover:text-amber hover:bg-amber/10 transition-colors"
                        title="View stock"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-syne text-sm font-semibold text-[#E2E8F0] mb-1.5 leading-snug">
                    {note.title}
                  </h3>

                  {/* Body */}
                  {note.body && (
                    <p className="font-mono text-xs text-[#64748B] line-clamp-3 leading-relaxed">
                      {note.body}
                    </p>
                  )}

                  {/* Footer */}
                  <div className="mt-3 pt-2 border-t border-[rgba(255,255,255,0.04)]">
                    <span className="font-mono text-[10px] text-[#64748B]">
                      Updated {formatDate(note.updated_at)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Edit modal */}
      {editingNote && (
        <NoteModal
          open={!!editingNote}
          onClose={() => setEditingNote(null)}
          ticker={editingNote.ticker}
          date={editingNote.date}
          note={editingNote}
          onSave={handleEditSave}
        />
      )}
    </div>
  )
}
