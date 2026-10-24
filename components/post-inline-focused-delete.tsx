'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export type PostInlineFocusedDeleteProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  anchorRef: React.RefObject<HTMLElement | null>
  postId: string
  target: 'moment' | 'lyric-back'
  onDeleted?: (outcome?: 'deleted' | 'shelled') => void
}

/**
 * Inline focused delete (Scott spec): light page scrim, anchored card stays bright,
 * solid confirm attached under the post/row. Portals scrim + panel host only —
 * not a centered popup.
 */
export function PostInlineFocusedDelete({
  open,
  onOpenChange,
  anchorRef,
  postId,
  target,
  onDeleted,
}: PostInlineFocusedDeleteProps) {
  const [mounted, setMounted] = useState(false)
  const [host, setHost] = useState<HTMLElement | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isLyricBack = target === 'lyric-back'
  const title = isLyricBack ? 'Delete this Lyric Back?' : 'Delete this Moment?'
  const body = 'This can\u2019t be undone.'

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
    const anchor = anchorRef.current
    if (!anchor) return
    const bottomInset = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--margo-page-bottom') || '88',
      10,
    )
    anchor.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    requestAnimationFrame(() => {
      const r = anchor.getBoundingClientRect()
      const vvh = window.visualViewport?.height ?? window.innerHeight
      const maxBottom = vvh - bottomInset - 8
      if (r.bottom > maxBottom) {
        window.scrollBy({ top: r.bottom - maxBottom, behavior: 'smooth' })
      }
    })
  }, [open, anchorRef])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    anchorRef.current?.classList.add('margo-inline-delete-focus-anchor')
    return () => {
      document.body.style.overflow = prev
      anchorRef.current?.classList.remove('margo-inline-delete-focus-anchor')
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
        throw new Error(typeof payload.error === 'string' ? payload.error : 'Something wrong.')
      }
      onOpenChange(false)
      const outcome = payload.outcome === 'shelled' ? 'shelled' : 'deleted'
      onDeleted?.(target === 'lyric-back' ? outcome : undefined)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something wrong.')
      setDeleting(false)
    }
  }

  const panel = (
    <div
      className="margo-inline-delete-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`margo-inline-delete-title-${postId}`}
      data-no-card-nav
      data-margo-delete-ui="inline"
    >
      <p id={`margo-inline-delete-title-${postId}`} className="margo-inline-delete-panel__title">
        {title}
      </p>
      <p className="margo-inline-delete-panel__body">{body}</p>
      {error ? (
        <p className="margo-inline-delete-panel__error" role="alert">{error}</p>
      ) : null}
      <div className="margo-inline-delete-panel__actions">
        <button
          type="button"
          className="margo-inline-delete-panel__cancel"
          disabled={deleting}
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </button>
        <button
          type="button"
          className="margo-inline-delete-panel__confirm"
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
      className="margo-inline-delete-scrim"
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
