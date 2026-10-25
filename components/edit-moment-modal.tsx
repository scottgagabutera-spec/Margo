'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { matchLyricLine } from '@/lib/lyric-match'
import { useKeyboardSafeChrome } from '@/hooks/useVisualViewport'
import type { PostLine, PostLineSource } from '@/lib/post-lines'

const supabase = createClient()

interface EditMomentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  postId: string
  /** The full ordered Moment — resolveMomentLines(post) output. */
  lines: PostLine[]
  echoCount?: number
  onSaved?: () => void
}

interface DraftLine {
  text: string
  songTitle: string
  artistName: string
  songId: string | null
  artworkUrl: string | null
  snippetStart: number | null
  snippetEnd: number | null
  source: PostLineSource
  textChanged: boolean
}

function toDraft(l: PostLine): DraftLine {
  return {
    text: l.text || '',
    songTitle: l.songTitle || '',
    artistName: l.artistName || '',
    songId: l.songId ?? null,
    artworkUrl: l.artworkUrl ?? null,
    snippetStart: l.snippetStart ?? null,
    snippetEnd: l.snippetEnd ?? null,
    source: l.source || 'external',
    textChanged: false,
  }
}

/** Keep the focused field inside the sheet scroller, not the page. */
function keepFieldInSheet(field: HTMLElement) {
  const scroller = field.closest('.margo-edit-sheet__scroll')
  if (!(scroller instanceof HTMLElement)) return
  const fieldRect = field.getBoundingClientRect()
  const scrollRect = scroller.getBoundingClientRect()
  if (fieldRect.top < scrollRect.top) {
    scroller.scrollTop -= scrollRect.top - fieldRect.top + 8
  } else if (fieldRect.bottom > scrollRect.bottom) {
    scroller.scrollTop += fieldRect.bottom - scrollRect.bottom + 8
  }
}

/**
 * Edit an entire Moment — one or many lines — rather than the legacy
 * single-lyric-field editor. Loading only post.text (the position-0
 * mirror) was the root cause of "Edit shows one line for a 3-line
 * Moment": it never read post_lines at all, and saving only touched the
 * mirror field, which PostCard/resolveMomentLines ignore once post_lines
 * rows exist — the edit had no visible effect. This loads and saves the
 * complete ordered set via update_own_moment (atomic — see the
 * 20260821 migration), so a multi-line Moment stays one post with all
 * its lines, in order, never silently collapsed to one.
 *
 * Portaled to document.body so the sheet is outside .margo-post-card
 * (word-break / overflow-wrap do not inherit) and position:fixed is
 * the viewport, not a transformed feed pane.
 */
export function EditMomentModal(props: EditMomentModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!props.open || !mounted) return null
  return createPortal(<EditMomentSheet {...props} />, document.body)
}

function EditMomentSheet({
  onOpenChange,
  postId,
  lines,
  echoCount = 0,
  onSaved,
}: EditMomentModalProps) {
  const [drafts, setDrafts] = useState<DraftLine[]>(() =>
    lines.length > 0 ? lines.map(toDraft) : [toDraft({ position: 0, text: '' })],
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { offsetTop, height, chromeHidden } = useKeyboardSafeChrome(true)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    const el = document.activeElement
    if (el instanceof HTMLElement && el.closest('.margo-edit-sheet')) {
      keepFieldInSheet(el)
    }
  }, [height, offsetTop, chromeHidden])

  const updateLine = (i: number, patch: Partial<DraftLine>) => {
    setDrafts(prev => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)))
  }

  const removeLine = (i: number) => {
    if (drafts.length <= 1 || i < 1) return
    setDrafts(prev => prev.filter((_, idx) => idx !== i))
  }

  const handleSave = async () => {
    const trimmed = drafts.map(d => ({ ...d, text: d.text.trim() }))
    if (trimmed.some(d => d.text.length === 0)) {
      setError('Every line needs words.')
      return
    }
    setSaving(true)
    setError(null)

    // Re-run the same matching a fresh post uses, but only for lines whose
    // text actually changed — untouched lines keep their existing timing.
    const resolved = await Promise.all(trimmed.map(async (d) => {
      if (!d.textChanged || !d.songId) return d
      const match = await matchLyricLine(supabase, d.songId, d.text)
      return { ...d, snippetStart: match?.startSec ?? null, snippetEnd: match?.endSec ?? null }
    }))

    const payloadLines = resolved.map(d => ({
      text: d.text,
      song_id: d.songId || '',
      song_title: d.songTitle,
      artist_name: d.artistName,
      artwork_url: d.artworkUrl || '',
      snippet_start_sec: d.snippetStart ?? '',
      snippet_end_sec: d.snippetEnd ?? '',
      source: d.source,
    }))

    try {
      const res = await fetch('/api/posts/moment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, lines: payloadLines }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Something went wrong.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
      setSaving(false)
      return
    }

    // Moderation re-check per changed line — same fire-and-forget pattern
    // creation and the old single-line editor already use.
    resolved.forEach(d => {
      if (d.textChanged) {
        fetch('/api/moderate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: d.text, postId }),
        }).catch(() => {})
      }
    })

    setSaving(false)
    onSaved?.()
    onOpenChange(false)
  }

  const close = () => {
    if (!saving) onOpenChange(false)
  }

  const onFieldFocus = (el: HTMLElement) => {
    window.requestAnimationFrame(() => keepFieldInSheet(el))
  }

  const sheet = (
    <div
      className={`margo-edit-sheet${chromeHidden ? ' margo-edit-sheet--keyboard' : ''}`}
    >
      <button
        type="button"
        className="margo-edit-sheet__scrim"
        aria-label="Cancel"
        disabled={saving}
        onClick={close}
      />
      <div
        className="margo-edit-sheet__band"
        style={{ top: offsetTop, height }}
      >
        <div
          className="margo-edit-sheet__card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="margo-edit-sheet-title"
        >
          <div className="margo-edit-sheet__head">
            <p id="margo-edit-sheet-title" className="margo-edit-sheet__title">Edit</p>
            {echoCount > 0 ? (
              <p className="margo-edit-sheet__replies">
                {echoCount === 1 ? '1 Lyric Back stays' : `${echoCount} Lyric Backs stay`}
              </p>
            ) : null}
          </div>

          <div className="margo-edit-sheet__scroll">
            {drafts.map((d, i) => (
              <div key={i} className="margo-edit-sheet__line">
                {i > 0 ? (
                  <div className="margo-edit-sheet__line-tools">
                    <button
                      type="button"
                      className="margo-edit-sheet__remove"
                      onClick={() => removeLine(i)}
                    >
                      Remove
                    </button>
                  </div>
                ) : null}
                <textarea
                  className="margo-edit-sheet__lyric"
                  value={d.text}
                  onChange={(e) => updateLine(i, { text: e.target.value.slice(0, 140), textChanged: true })}
                  onFocus={(e) => onFieldFocus(e.currentTarget)}
                  rows={drafts.length > 1 ? 2 : 3}
                  aria-label="Lyric"
                />
                <div className="margo-edit-sheet__meta">
                  <input
                    className="margo-edit-sheet__field"
                    value={d.songTitle}
                    onChange={(e) => updateLine(i, { songTitle: e.target.value })}
                    onFocus={(e) => onFieldFocus(e.currentTarget)}
                    placeholder="Song"
                    aria-label="Song"
                  />
                  <input
                    className="margo-edit-sheet__field"
                    value={d.artistName}
                    onChange={(e) => updateLine(i, { artistName: e.target.value })}
                    onFocus={(e) => onFieldFocus(e.currentTarget)}
                    placeholder="Artist"
                    aria-label="Artist"
                  />
                </div>
              </div>
            ))}
          </div>

          {error ? (
            <p className="margo-edit-sheet__error" role="alert">{error}</p>
          ) : null}

          <div className="margo-edit-sheet__actions">
            <button
              type="button"
              className="margo-edit-sheet__btn margo-edit-sheet__btn--cancel"
              onClick={close}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="margo-edit-sheet__btn margo-edit-sheet__btn--save"
              onClick={() => void handleSave()}
              disabled={saving || drafts.some(d => d.text.trim().length === 0)}
            >
              {saving ? 'Saving' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(sheet, document.body)
}
