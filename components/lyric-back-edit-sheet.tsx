'use client'

import { useEffect, useState } from 'react'
import { MargoSheet } from '@/components/margo-sheet'

const MAX_LYRIC = 500

type LyricBackEditSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  postId: string
  initialText: string
  initialEmotion: string
  parentEmotion: string
  onSaved?: (next: { text: string; emotion: string }) => void
}

export function LyricBackEditSheet({
  open,
  onOpenChange,
  postId,
  initialText,
  initialEmotion,
  parentEmotion,
  onSaved,
}: LyricBackEditSheetProps) {
  const [text, setText] = useState(initialText)
  const [emotion, setEmotion] = useState(initialEmotion)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setText(initialText)
    setEmotion(initialEmotion)
    setError(null)
  }, [open, initialText, initialEmotion])

  const canSave = Boolean(text.trim()) && !saving

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/posts/lyric-back', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          text: text.trim(),
          emotion,
        }),
      })
      const payload = (await res.json().catch(() => ({}))) as { error?: string }
      if (res.status === 403) {
        setError('Not allowed.')
        setSaving(false)
        return
      }
      if (!res.ok) {
        setError(typeof payload.error === 'string' ? payload.error : 'Could not save.')
        setSaving(false)
        return
      }
      fetch('/api/moderate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), postId }),
      }).catch(() => {})
      onSaved?.({ text: text.trim(), emotion })
      onOpenChange(false)
    } catch {
      setError('Could not save.')
      setSaving(false)
    }
  }

  return (
    <MargoSheet
      open={open}
      onOpenChange={(next) => {
        if (!saving) onOpenChange(next)
      }}
      title="Edit"
      heightMode="auto"
      maxHeight="min(52dvh, 360px)"
      bottomInset="tabbar-tight"
      zIndex={241}
      closeDisabled={saving}
    >
      <div className="margo-lb-owner-sheet margo-lb-edit-sheet">
        <label className="margo-lb-edit-sheet__field">
          <span className="margo-lb-edit-sheet__label">Lyric</span>
          <textarea
            className="margo-lb-edit-sheet__textarea"
            value={text}
            maxLength={MAX_LYRIC}
            rows={3}
            disabled={saving}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <input type="hidden" name="emotion" value={emotion} readOnly />
        <input type="hidden" name="parentEmotion" value={parentEmotion} readOnly />
        {error ? (
          <p className="margo-lb-owner-sheet__error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="margo-lb-owner-sheet__actions">
          <button
            type="button"
            className="margo-lb-owner-sheet__btn margo-lb-owner-sheet__btn--ghost"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="margo-lb-owner-sheet__btn"
            disabled={!canSave}
            onClick={() => void handleSave()}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </MargoSheet>
  )
}
