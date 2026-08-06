'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { matchLyricLine } from '@/lib/lyric-match'

const font = 'var(--font-lora), serif'

interface EditPostModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  postId: string
  initialText: string
  songId: string | null
  echoCount?: number
  onSaved?: (newText: string) => void
}

export function EditPostModal({
  open,
  onOpenChange,
  postId,
  initialText,
  songId,
  echoCount = 0,
  onSaved,
}: EditPostModalProps) {
  const [text, setText] = useState(initialText)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset to the current text whenever the modal is (re)opened, so a
  // cancelled edit never leaks into the next time it's opened.
  useEffect(() => {
    if (open) {
      setText(initialText)
      setError(null)
    }
  }, [open, initialText])

  if (!open) return null

  const handleSave = async () => {
    const trimmed = text.trim()
    if (!trimmed) {
      setError('Lyric cannot be empty.')
      return
    }
    setSaving(true)
    setError(null)

    // Re-run the exact same matching an edit is functionally a
    // re-submission of — same shared function compose/lyric-back use at
    // creation time. A confident match overwrites the stored snippet
    // timing; no match (or no linked song) clears it rather than leaving
    // stale timing that no longer corresponds to the new text.
    let resolvedStart: number | null = null
    let resolvedEnd: number | null = null
    if (songId) {
      const match = await matchLyricLine(supabase, songId, trimmed)
      if (match) {
        resolvedStart = match.startSec
        resolvedEnd = match.endSec
      }
    }

    const { error: updateErr } = await supabase
      .from('posts')
      .update({
        text: trimmed,
        snippet_start_sec: resolvedStart,
        snippet_end_sec: resolvedEnd,
      })
      .eq('id', postId)

    if (updateErr) {
      console.error('Failed to update post:', updateErr)
      setError('Something went wrong. Please try again.')
      setSaving(false)
      return
    }

    // Moderation re-check, same fire-and-forget pattern as post creation
    // — an edited lyric is a new piece of text and should go through the
    // same check a fresh post does.
    fetch('/api/moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed, postId }),
    }).catch(() => {})

    setSaving(false)
    onSaved?.(trimmed)
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
          zIndex: 101, width: 'min(440px, calc(100vw - 48px))',
          background: '#0f0e14', border: '1px solid rgba(232,197,71,0.18)',
          borderRadius: '20px', padding: '28px 24px',
        }}
      >
        <p style={{ fontFamily: font, fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px', textAlign: 'center' }}>
          Edit Lyric
        </p>

        {echoCount > 0 && (
          <p style={{
            fontFamily: font, fontSize: '0.72rem', color: 'var(--text-secondary)',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', lineHeight: 1.5,
          }}>
            {echoCount} {echoCount === 1 ? 'person has' : 'people have'} replied to this — they&apos;re still responding to what you originally wrote.
          </p>
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 140))}
          rows={3}
          autoFocus
          style={{
            width: '100%', background: 'rgba(232,197,71,0.04)',
            border: '1px solid rgba(232,197,71,0.22)', borderRadius: '12px',
            padding: '14px', fontSize: '1.05rem', fontFamily: font, fontStyle: 'italic',
            color: 'var(--gold)', lineHeight: 1.6, outline: 'none', resize: 'none',
            boxSizing: 'border-box', marginBottom: '8px',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <span style={{ fontFamily: font, fontSize: '0.55rem', color: 'var(--text-muted)' }}>{text.length}/140</span>
        </div>

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
            disabled={saving || text.trim().length === 0}
            style={{
              flex: 1, padding: '12px', minHeight: '44px', boxSizing: 'border-box',
              background: 'var(--gold)', border: 'none', borderRadius: '50px',
              color: 'var(--bg)', fontFamily: font, fontWeight: 700,
              fontSize: '0.58rem', letterSpacing: '1px', textTransform: 'uppercase',
              cursor: saving || text.trim().length === 0 ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </>
  )
}