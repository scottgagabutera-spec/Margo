'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { matchLyricLine } from '@/lib/lyric-match'
import { UI_FONT } from '@/lib/fonts'
import type { PostLine, PostLineSource } from '@/lib/post-lines'

const supabase = createClient()

const font = 'var(--font-lora), serif'

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
 */
export function EditMomentModal({
  open,
  onOpenChange,
  postId,
  lines,
  echoCount = 0,
  onSaved,
}: EditMomentModalProps) {
  const [drafts, setDrafts] = useState<DraftLine[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setDrafts(lines.length > 0 ? lines.map(toDraft) : [toDraft({ position: 0, text: '' })])
      setError(null)
    }
  }, [open, lines])

  if (!open) return null

  const multi = drafts.length > 1

  const updateLine = (i: number, patch: Partial<DraftLine>) => {
    setDrafts(prev => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)))
  }

  const removeLine = (i: number) => {
    if (drafts.length <= 1) return
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

  return (
    <>
      <div
        onClick={() => !saving && onOpenChange(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(7,6,10,0.85)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        }}
      />
      <div
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 101, width: 'min(480px, calc(100vw - 32px))',
          background: '#0f0e14', border: '1px solid rgba(232,197,71,0.18)',
          borderRadius: '20px', padding: '24px 20px',
          maxHeight: '86dvh', overflowY: 'auto', boxSizing: 'border-box',
        }}
      >
        <p style={{ fontFamily: font, fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: multi ? '4px' : '16px', textAlign: 'center' }}>
          {multi ? 'Edit Moment' : 'Edit Lyric'}
        </p>
        {multi && (
          <p style={{ fontFamily: font, fontSize: '0.72rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '16px' }}>
            This Moment has {drafts.length} lines.
          </p>
        )}

        {echoCount > 0 && (
          <p style={{
            fontFamily: font, fontSize: '0.72rem', color: 'var(--text-secondary)',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', lineHeight: 1.5,
          }}>
            {echoCount} {echoCount === 1 ? 'person has' : 'people have'} replied to this — they&apos;re still responding to what you originally wrote.
          </p>
        )}

        {drafts.map((d, i) => (
          <div
            key={i}
            style={{
              marginBottom: '16px', paddingBottom: multi && i < drafts.length - 1 ? '16px' : 0,
              borderBottom: multi && i < drafts.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
            }}
          >
            {multi && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontFamily: UI_FONT, fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  Line {i + 1}
                </span>
                {drafts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontFamily: font, fontSize: '0.65rem', cursor: 'pointer', padding: '4px 8px' }}
                  >Remove</button>
                )}
              </div>
            )}
            <textarea
              value={d.text}
              onChange={(e) => updateLine(i, { text: e.target.value.slice(0, 140), textChanged: true })}
              rows={multi ? 2 : 3}
              style={{
                width: '100%', background: 'rgba(232,197,71,0.04)',
                border: '1px solid rgba(232,197,71,0.22)', borderRadius: '12px',
                padding: '14px', fontSize: multi ? '0.95rem' : '1.05rem', fontFamily: font, fontStyle: 'italic',
                color: 'var(--gold)', lineHeight: 1.6, outline: 'none', resize: 'none',
                boxSizing: 'border-box', marginBottom: '8px',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
              <input
                value={d.songTitle}
                onChange={(e) => updateLine(i, { songTitle: e.target.value })}
                placeholder="Song"
                style={{ flex: 1, minWidth: 0, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 10px', fontFamily: UI_FONT, fontSize: '0.78rem', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }}
              />
              <input
                value={d.artistName}
                onChange={(e) => updateLine(i, { artistName: e.target.value })}
                placeholder="Artist"
                style={{ flex: 1, minWidth: 0, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 10px', fontFamily: UI_FONT, fontSize: '0.78rem', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <span style={{ fontFamily: font, fontSize: '0.55rem', color: 'var(--text-muted)' }}>{d.text.length}/140</span>
            </div>
          </div>
        ))}

        {error && (
          <p style={{ fontFamily: font, fontSize: '0.75rem', color: '#ff6b6b', textAlign: 'center', marginBottom: '14px' }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => onOpenChange(false)}
            disabled={saving}
            style={{
              flex: 1, padding: '12px', minHeight: '44px', boxSizing: 'border-box',
              background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '50px', color: 'var(--text-secondary)', fontFamily: font,
              fontSize: '0.58rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || drafts.some(d => d.text.trim().length === 0)}
            style={{
              flex: 1, padding: '12px', minHeight: '44px', boxSizing: 'border-box',
              background: 'var(--gold)', border: 'none', borderRadius: '50px',
              color: 'var(--bg)', fontFamily: font, fontWeight: 700,
              fontSize: '0.58rem', letterSpacing: '1px', textTransform: 'uppercase',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </>
  )
}
