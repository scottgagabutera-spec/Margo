'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export type PostFocusedDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  anchorRef: React.RefObject<HTMLElement | null>
  postId: string
  /** moment → DELETE /api/posts/moment; lyric-back → DELETE /api/posts/lyric-back */
  target: 'moment' | 'lyric-back'
  title?: string
  body?: string
  onDeleted?: (outcome?: 'deleted' | 'shelled') => void
}

/**
 * Delete confirm while the post/row stays in focus: full-page scrim blurs the feed;
 * the confirm panel renders inline at the bottom of the anchored card (same slot as inline report).
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
  const [host, setHost] = useState<HTMLElement | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setMounted(true), [])

  useLayoutEffect(() => {
    if (!open) {
      setHost(null)
      return
    }
    const el = anchorRef.current?.querySelector(
      `[data-delete-inline-host="${postId}"]`,
    )
    setHost(el instanceof HTMLElement ? el : null)
  }, [open, anchorRef, postId])

  useEffect(() => {
    if (!open) return
    anchorRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
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

  useEffect(() => {
    if (!open) {
      setDeleting(false)
      setError(null)
    }
  }, [open])

  if (!open || !mounted) return null

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

  const panel = (
    <div
      className="margo-delete-focus-panel margo-delete-focus-panel--inline"
      role="dialog"
      aria-modal="true"
      data-no-card-nav
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
  )

  const scrim = (
    <div
      className="margo-delete-focus-scrim"
      role="presentation"
      onClick={() => !deleting && onOpenChange(false)}
    />
  )

  return (
    <>
      {createPortal(scrim, document.body)}
      {host ? createPortal(panel, host) : null}
    </>
  )
}
