'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Pencil, Trash2, StickyNote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Note } from '@/lib/types'
import { formatDate } from '@/lib/utils'

interface NotesListProps {
  notes: Note[]
  onEdit: (note: Note) => void
  onDelete: (id: number) => void
  onNoteClick: (date: string) => void
  activeDate?: string
}

export function NotesList({ notes, onEdit, onDelete, onNoteClick, activeDate }: NotesListProps) {
  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <StickyNote className="h-8 w-8 text-[#2A2A2E]" />
        <p className="font-mono text-xs text-[#64748B] text-center leading-relaxed">
          No notes yet.
          <br />
          Click on a date in the chart
          <br />
          to add an observation.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {notes.map((note) => {
          const isActive = note.date === activeDate
          return (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              onClick={() => onNoteClick(note.date)}
              className={`
                group relative rounded-lg border p-3 cursor-pointer
                transition-all duration-150
                ${isActive
                  ? 'border-amber/40 bg-[rgba(240,180,41,0.06)] shadow-[0_0_20px_-10px_rgba(240,180,41,0.3)]'
                  : 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(240,180,41,0.2)] hover:bg-[rgba(240,180,41,0.03)]'
                }
              `}
            >
              {/* Amber left accent */}
              <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-amber" />

              <div className="pl-2">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-mono text-[10px] text-[#64748B]">
                    {formatDate(note.date)}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(note)
                      }}
                      className="p-1 rounded text-[#64748B] hover:text-amber hover:bg-[rgba(240,180,41,0.1)] transition-colors"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(note.id)
                      }}
                      className="p-1 rounded text-[#64748B] hover:text-loss hover:bg-[rgba(220,38,38,0.1)] transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <h4 className="font-syne text-xs font-semibold text-[#E2E8F0] mb-1 leading-tight">
                  {note.title}
                </h4>

                {note.body && (
                  <p className="font-mono text-[10px] text-[#64748B] line-clamp-2 leading-relaxed">
                    {note.body}
                  </p>
                )}
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
