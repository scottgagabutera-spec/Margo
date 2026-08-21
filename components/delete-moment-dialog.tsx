'use client'
import { useState } from 'react'

const font = 'var(--font-lora), serif'

interface DeleteMomentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  postId: string
  /** Called after the Moment is confirmed deleted server-side. */
  onDeleted?: () => void
}

/**
 * Confirmation + server call for deleting an owned Moment. Ownership is
 * re-verified server-side (see app/api/posts/moment DELETE) — this
 * component only handles the confirm step and surfaces failures.
 */
export function DeleteMomentDialog({ open, onOpenChange, postId, onDeleted }: DeleteMomentDialogProps) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch('/api/posts/moment', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Something went wrong.')
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

  return (
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
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 101, width: 'min(380px, calc(100vw - 48px))',
          background: '#0f0e14', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px', padding: '28px 24px', textAlign: 'center', boxSizing: 'border-box',
        }}
      >
        <p style={{ fontFamily: font, fontStyle: 'italic', fontSize: '1.15rem', color: 'var(--text)', marginBottom: '8px' }}>
          Delete this Moment?
        </p>
        <p style={{ fontFamily: font, fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '22px', lineHeight: 1.5 }}>
          This can&apos;t be undone. It will be removed from Feed, your profile, and anywhere else it appears.
        </p>
        {error && (
          <p style={{ fontFamily: font, fontSize: '0.75rem', color: '#ff6b6b', marginBottom: '14px' }}>{error}</p>
        )}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => onOpenChange(false)}
            disabled={deleting}
            style={{
              flex: 1, padding: '12px', minHeight: '44px', boxSizing: 'border-box',
              background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '50px', color: 'var(--text-secondary)', fontFamily: font,
              fontSize: '0.58rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
              cursor: deleting ? 'not-allowed' : 'pointer',
            }}
          >Cancel</button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              flex: 1, padding: '12px', minHeight: '44px', boxSizing: 'border-box',
              background: '#ff6060', border: 'none', borderRadius: '50px',
              color: '#07060A', fontFamily: font, fontWeight: 700,
              fontSize: '0.58rem', letterSpacing: '1px', textTransform: 'uppercase',
              cursor: deleting ? 'not-allowed' : 'pointer',
              opacity: deleting ? 0.7 : 1,
            }}
          >{deleting ? 'Deleting…' : 'Delete'}</button>
        </div>
      </div>
    </>
  )
}
