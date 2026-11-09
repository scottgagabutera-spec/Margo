'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from '@/components/icons'

export function MargoMemoryCenteredDialog({
  open,
  onOpenChange,
  title,
  titleId,
  widthPx = 264,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  titleId?: string
  widthPx?: number
  children: ReactNode
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  if (!open || !mounted) return null

  const headingId = titleId ?? 'margo-memory-dialog-title'

  return createPortal(
    <div className="margo-memory-dialog-root" role="presentation">
      <button
        type="button"
        className="margo-memory-dialog-root__dismiss"
        aria-label="Close"
        onClick={() => onOpenChange(false)}
      />
      <div className="margo-memory-dialog-root__frame">
        <div
          className="margo-memory-dialog-root__panel"
          role="dialog"
          aria-modal
          aria-labelledby={headingId}
          style={{ width: widthPx, maxWidth: 'min(90vw, 340px)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="margo-memory-dialog-root__head">
            <h2 id={headingId} className="margo-memory-dialog-root__title">
              {title}
            </h2>
            <button
              type="button"
              className="margo-memory-dialog-root__close"
              aria-label="Close"
              onClick={() => onOpenChange(false)}
            >
              <CloseIcon size={16} color="var(--text-secondary)" />
            </button>
          </div>
          <div className="margo-memory-dialog-root__body">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** Full-height scroll surface between top nav and tab bar (listening / when flow). */
export function MargoMemoryFlowOverlay({
  open,
  onOpenChange,
  title,
  children,
  footer,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open || !mounted) return null

  return createPortal(
    <div className="margo-memory-flow-overlay" role="dialog" aria-modal aria-label={title}>
      <button
        type="button"
        className="margo-memory-flow-overlay__back"
        aria-label="Close"
        onClick={() => onOpenChange(false)}
      >
        <CloseIcon size={18} color="var(--text-secondary)" />
      </button>
      <div className="margo-memory-flow-overlay__scroll">
        <header className="margo-memory-flow-overlay__header">
          <h1 className="margo-memory-type-title">{title}</h1>
        </header>
        {children}
      </div>
      {footer ? <div className="margo-memory-flow-overlay__footer-slot">{footer}</div> : null}
    </div>,
    document.body,
  )
}
