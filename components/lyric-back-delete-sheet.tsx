'use client'

import { useState } from 'react'
import { MargoSheet } from '@/components/margo-sheet'

type LyricBackDeleteSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  postId: string
  onDeleted?: (outcome: 'deleted' | 'shelled') => void
}

export function LyricBackDeleteSheet({
  open,
  onOpenChange,
  postId,
  onDeleted,
}: LyricBackDeleteSheetProps) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch('/api/posts/lyric-back', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      })
      const body = (await res.json().catch(() => ({}))) as {
        error?: string
        outcome?: 'deleted' | 'shelled'
      }
      if (!res.ok) {
        setError(typeof body.error === 'string' ? body.error : 'Could not delete.')
        setDeleting(false)
        return
      }
      onOpenChange(false)
      onDeleted?.(body.outcome === 'shelled' ? 'shelled' : 'deleted')
    } catch {
      setError('Could not delete.')
      setDeleting(false)
    }
  }

  return (
    <MargoSheet
      open={open}
      onOpenChange={(next) => {
        if (!deleting) onOpenChange(next)
      }}
      title="Delete"
      heightMode="auto"
      maxHeight="min(40dvh, 280px)"
      bottomInset="tabbar-tight"
      zIndex={241}
      closeDisabled={deleting}
    >
      <div className="margo-lb-owner-sheet">
        <p className="margo-lb-owner-sheet__lead">Delete this Lyric Back?</p>
        {error ? (
          <p className="margo-lb-owner-sheet__error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="margo-lb-owner-sheet__actions">
          <button
            type="button"
            className="margo-lb-owner-sheet__btn margo-lb-owner-sheet__btn--ghost"
            disabled={deleting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="margo-lb-owner-sheet__btn margo-lb-owner-sheet__btn--danger"
            disabled={deleting}
            onClick={() => void handleDelete()}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </MargoSheet>
  )
}
