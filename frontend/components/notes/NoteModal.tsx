'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import type { Note } from '@/lib/types'
import { formatDate } from '@/lib/utils'

interface NoteModalProps {
  open: boolean
  onClose: () => void
  ticker: string
  date: string
  note?: Note
  onSave: (data: { title: string; body: string }) => Promise<void>
}

export function NoteModal({ open, onClose, ticker, date, note, onSave }: NoteModalProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle(note?.title ?? '')
      setBody(note?.body ?? '')
    }
  }, [open, note])

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      await onSave({ title: title.trim(), body: body.trim() })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const isEditing = !!note

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Note' : 'Add Note'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Metadata row */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-xs font-mono text-[#64748B] mb-1 block uppercase tracking-wider">
                Ticker
              </label>
              <div className="h-9 px-3 flex items-center rounded-md border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] font-syne font-bold text-amber text-sm">
                {ticker}
              </div>
            </div>
            <div className="flex-1">
              <label className="text-xs font-mono text-[#64748B] mb-1 block uppercase tracking-wider">
                Date
              </label>
              <div className="h-9 px-3 flex items-center rounded-md border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] font-mono text-xs text-[#64748B]">
                {formatDate(date)}
              </div>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-mono text-[#64748B] mb-1.5 block uppercase tracking-wider">
              Title <span className="text-loss">*</span>
            </label>
            <Input
              placeholder="e.g., Earnings beat, sector rotation..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.metaKey) handleSave()
              }}
            />
          </div>

          {/* Body */}
          <div>
            <label className="text-xs font-mono text-[#64748B] mb-1.5 block uppercase tracking-wider">
              Notes
            </label>
            <Textarea
              placeholder="Your observations, analysis, or reminders..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[120px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.metaKey) handleSave()
              }}
            />
            <p className="text-[10px] font-mono text-[#64748B] mt-1">
              ⌘ + Enter to save
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="amber"
            size="sm"
            onClick={handleSave}
            disabled={!title.trim() || saving}
          >
            {saving ? 'Saving...' : isEditing ? 'Update Note' : 'Save Note'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
