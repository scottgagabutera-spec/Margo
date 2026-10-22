'use client'

import { useEffect, useState } from 'react'
import { MargoSheet } from '@/components/margo-sheet'
import { ReplayAttribution } from '@/components/replay-attribution'
import { useIdentity } from '@/hooks/useIdentity'
import { UI_FONT, LYRIC_FONT } from '@/lib/fonts'
import type { Post } from '@/hooks/usePosts'

export interface RepostSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  post: Post
  replayed: boolean
  existingNote?: string | null
  onRepost: (postId: string) => Promise<boolean | void> | boolean | void
  onRepostWithNote: (postId: string, note: string) => Promise<boolean | void> | boolean | void
  onUndo: (postId: string) => Promise<boolean | void> | boolean | void
}

const actionStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  minHeight: 'var(--margo-touch-min)',
  padding: '12px 16px',
  border: 'none',
  borderTop: '1px solid var(--border)',
  background: 'transparent',
  fontFamily: UI_FONT,
  fontSize: '0.78rem',
  fontWeight: 700,
  color: 'var(--gold)',
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
} as const

/**
 * Preview of a repost in the Margo feed, then confirm.
 * Auth is checked by the opener before this opens.
 */
export function RepostSheet({
  open,
  onOpenChange,
  post,
  replayed,
  existingNote = null,
  onRepost,
  onRepostWithNote,
  onUndo,
}: RepostSheetProps) {
  const { identity } = useIdentity()
  const [noteMode, setNoteMode] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) return
    setNoteMode(false)
    setNote('')
    setBusy(false)
  }, [open])

  const run = async (fn: () => Promise<boolean | void> | boolean | void) => {
    if (busy) return
    setBusy(true)
    try {
      const result = await fn()
      if (result !== false) onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  const username = identity?.username?.trim() || null

  return (
    <MargoSheet open={open} onOpenChange={onOpenChange} title="Repost" zIndex={220}>
      <p style={{
        margin: '0 0 10px',
        fontFamily: UI_FONT,
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
      }}>
        How it appears in the feed
      </p>
      <ReplayAttribution
        username={username}
        displayName={identity?.displayName ?? null}
        avatarUrl={identity?.avatarUrl ?? null}
        quoteText={noteMode ? (note.trim() || null) : (existingNote?.trim() || null)}
        inertCard
        cardProps={{
          post,
          variant: 'compact',
          disableCardNav: true,
          recordImpression: false,
          resonated: false,
          resonateCount: post.resonates ?? 0,
          echoCount: post.replies ?? 0,
          onResonate: () => {},
          onExport: () => {},
        }}
      />
      {noteMode ? (
        <div style={{ marginTop: '12px' }}>
          <label
            htmlFor={`repost-note-${post.id}`}
            style={{
              display: 'block',
              marginBottom: '8px',
              fontFamily: UI_FONT,
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
            }}
          >
            Note
          </label>
          <textarea
            id={`repost-note-${post.id}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note…"
            rows={3}
            disabled={busy}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              resize: 'vertical',
              fontFamily: LYRIC_FONT,
              fontSize: '1rem',
              color: 'var(--text)',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '10px',
              outline: 'none',
              marginBottom: '8px',
            }}
          />
          <button
            type="button"
            disabled={busy || !note.trim()}
            onClick={() => {
              const text = note.trim()
              if (!text) return
              void run(() => onRepostWithNote(post.id, text))
            }}
            style={{
              ...actionStyle,
              borderTop: 'none',
              borderRadius: '8px',
              background: 'var(--gold)',
              color: 'var(--bg)',
              opacity: busy || !note.trim() ? 0.45 : 1,
            }}
          >
            Repost
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setNoteMode(false)
              setNote('')
            }}
            style={{ ...actionStyle, color: 'var(--text-muted)', borderTop: 'none' }}
          >
            Back
          </button>
        </div>
      ) : (
        <div style={{ marginTop: '8px' }}>
          {replayed ? null : (
            <button
              type="button"
              disabled={busy}
              onClick={() => { void run(() => onRepost(post.id)) }}
              style={{ ...actionStyle, borderTop: 'none', opacity: busy ? 0.45 : 1 }}
            >
              Repost
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => setNoteMode(true)}
            style={{
              ...actionStyle,
              borderTop: replayed ? 'none' : '1px solid var(--border)',
              opacity: busy ? 0.45 : 1,
            }}
          >
            Repost with a note
          </button>
          {replayed ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => { void run(() => onUndo(post.id)) }}
              style={{ ...actionStyle, color: 'var(--text-secondary)', opacity: busy ? 0.45 : 1 }}
            >
              Undo repost
            </button>
          ) : null}
        </div>
      )}
    </MargoSheet>
  )
}
