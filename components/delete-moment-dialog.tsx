'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const font = 'var(--font-lora), serif'

type DeletePostTarget = 'moment' | 'lyric-back'

interface DeleteMomentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  postId: string
  /** moment → DELETE /api/posts/moment; lyric-back → DELETE /api/posts/lyric-back */
  target?: DeletePostTarget
  /** Moment: called after delete. Lyric Back: receives server outcome (deleted | shelled). */
  onDeleted?: (outcome?: 'deleted' | 'shelled') => void
}

/**
 * Confirmation + server call for deleting an owned Moment. Ownership is
 * re-verified server-side (see app/api/posts/moment DELETE) — this
 * component only handles the confirm step and surfaces failures.
 *
 * Portaled to document.body so fixed UI is not trapped under feed cards
 * (PostCard uses isolation + z-index when the Lyric Back panel is open).
 */
export function DeleteMomentDialog({
  open,
  onOpenChange,
  postId,
  target = 'moment',
  onDeleted,
}: DeleteMomentDialogProps) {
  const [mounted, setMounted] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setMounted(true), [])

  if (!open || !mounted) return null

  const isLyricBack = target === 'lyric-back'
  const title = isLyricBack ? 'Delete this Lyric Back?' : 'Delete this Moment?'
  const body = 'This can\u2019t be undone.'

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      if (isLyricBack) {
        const res = await fetch('/api/posts/lyric-back', {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId }),
        })
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string
          outcome?: 'deleted' | 'shelled'
        }
        if (!res.ok) {
          throw new Error(typeof payload.error === 'string' ? payload.error : 'Something went wrong.')
        }
        setDeleting(false)
        onOpenChange(false)
        onDeleted?.(payload.outcome === 'shelled' ? 'shelled' : 'deleted')
        return
      }
      const res = await fetch('/api/posts/moment', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      })
      if (!res.ok) {
        const bodyJson = await res.json().catch(() => ({}))
        throw new Error(bodyJson.error || 'Something went wrong.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
      setDeleting(false)
      return
    }
    setDeleting(false)
    onOpenChange(false)
    onDeleted?.()
  }

  const ui = (
    <>
      <div
        onClick={() => !deleting && onOpenChange(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(7,6,10,0.85)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 101,
          width: 'min(340px, calc(100vw - 48px))',
          background: '#0f0e14',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          padding: '18px 16px max(18px, env(safe-area-inset-bottom, 0px))',
          paddingTop: 'max(18px, env(safe-area-inset-top, 0px))',
          textAlign: 'center',
          boxSizing: 'border-box',
        }}
      >
        <p style={{
          fontFamily: font,
          fontStyle: 'italic',
          fontSize: '1.0625rem',
          color: 'var(--text)',
          margin: '0 0 6px',
          lineHeight: 1.3,
        }}>
          {title}
        </p>
        <p style={{
          fontFamily: font,
          fontSize: '0.8125rem',
          color: 'var(--text-secondary)',
          margin: '0 0 16px',
          lineHeight: 1.35,
        }}>
          {body}
        </p>
        {error ? (
          <p style={{ fontFamily: font, fontSize: '0.75rem', color: '#ff6b6b', margin: '0 0 12px' }}>{error}</p>
        ) : null}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
            style={{
              flex: 1,
              padding: '10px 12px',
              minHeight: '44px',
              boxSizing: 'border-box',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '50px',
              color: 'var(--text-secondary)',
              fontFamily: font,
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              cursor: deleting ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={deleting}
            style={{
              flex: 1,
              padding: '10px 12px',
              minHeight: '44px',
              boxSizing: 'border-box',
              background: '#ff6060',
              border: 'none',
              borderRadius: '50px',
              color: '#07060A',
              fontFamily: font,
              fontWeight: 700,
              fontSize: '0.75rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              cursor: deleting ? 'not-allowed' : 'pointer',
              opacity: deleting ? 0.7 : 1,
            }}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </>
  )

  return createPortal(ui, document.body)
}
