'use client'

import { useEffect, useLayoutEffect, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'

const font = 'var(--font-lora), serif'

export type PostFocusedDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  anchorRef: RefObject<HTMLElement | null>
  postId: string
  /** moment → DELETE /api/posts/moment; lyric-back → DELETE /api/posts/lyric-back */
  target: 'moment' | 'lyric-back'
  title?: string
  body?: string
  onDeleted?: (outcome?: 'deleted' | 'shelled') => void
}

type Box = { top: number; left: number; width: number; height: number }

function measureAnchor(el: HTMLElement | null): Box | null {
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

/**
 * Delete confirm anchored to the post/row: the card stays visible above the scrim;
 * a small panel matches the post width below it.
 */
export function PostFocusedDeleteDialog({
  open,
  onOpenChange,
  anchorRef,
  postId,
  target,
  title = 'Delete this Moment?',
  body = 'This can\u2019t be undone. It will be removed from Feed, your profile, and anywhere else it appears.',
  onDeleted,
}: PostFocusedDeleteDialogProps) {
  const [mounted, setMounted] = useState(false)
  const [box, setBox] = useState<Box | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setMounted(true), [])

  useLayoutEffect(() => {
    if (!open) return
    const update = () => setBox(measureAnchor(anchorRef.current))
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    const vv = window.visualViewport
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
    }
  }, [open, anchorRef])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    anchorRef.current?.classList.add('margo-delete-focus-anchor')
    return () => {
      document.body.style.overflow = prev
      anchorRef.current?.classList.remove('margo-delete-focus-anchor')
    }
  }, [open, anchorRef])

  if (!open || !mounted) return null

  const panelWidth = box ? Math.min(Math.max(box.width, 280), 380) : 320
  const panelLeft = box
    ? Math.min(Math.max(box.left + (box.width - panelWidth) / 2, 16), window.innerWidth - panelWidth - 16)
    : (window.innerWidth - panelWidth) / 2
  const panelTop = box ? box.top + box.height + 10 : window.innerHeight * 0.4

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      const url = target === 'moment' ? '/api/posts/moment' : '/api/posts/lyric-back'
      const res = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof payload.error === 'string' ? payload.error : 'Something went wrong.')
      }
      onOpenChange(false)
      const outcome =
        payload.outcome === 'shelled' ? 'shelled' : 'deleted'
      onDeleted?.(target === 'lyric-back' ? outcome : undefined)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
      setDeleting(false)
    }
  }

  return createPortal(
    <>
      <div
        className="margo-delete-focus-scrim"
        role="presentation"
        onClick={() => !deleting && onOpenChange(false)}
      />
      <div
        className="margo-delete-focus-panel"
        role="dialog"
        aria-modal="true"
        style={{
          top: `${panelTop}px`,
          left: `${panelLeft}px`,
          width: `${panelWidth}px`,
        }}
      >
        <p className="margo-delete-focus-panel__title">{title}</p>
        <p className="margo-delete-focus-panel__body">{body}</p>
        {error ? (
          <p className="margo-delete-focus-panel__error" role="alert">{error}</p>
        ) : null}
        <div className="margo-delete-focus-panel__actions">
          <button
            type="button"
            className="margo-delete-focus-panel__cancel"
            disabled={deleting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="margo-delete-focus-panel__confirm"
            disabled={deleting}
            onClick={() => void handleDelete()}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}
