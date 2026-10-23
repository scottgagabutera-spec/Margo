'use client'

import { useEffect, useState } from 'react'
import { MargoConfirmDialog } from '@/components/margo-confirm-dialog'

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

  useEffect(() => {
    if (open) {
      setError(null)
      setDeleting(false)
    }
  }, [open])

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
    <MargoConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!deleting) onOpenChange(next)
      }}
      title="Delete this Lyric Back?"
      confirmLabel="Delete"
      cancelLabel="Cancel"
      confirmBusyLabel="Deleting…"
      busy={deleting}
      onConfirm={handleDelete}
    >
      {error ? (
        <p className="margo-lb-owner-sheet__error" role="alert">
          {error}
        </p>
      ) : null}
    </MargoConfirmDialog>
  )
}
