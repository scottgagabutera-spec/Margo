'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export type MargoConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void | Promise<void>
  confirmDisabled?: boolean
  confirmBusyLabel?: string
  busy?: boolean
  zIndex?: number
}

const SCRIM = 'var(--surface, #0F0E13)'

/**
 * Small centered confirm — opaque scrim, no see-through stack with sheets.
 */
export function MargoConfirmDialog({
  open,
  onOpenChange,
  title,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  confirmDisabled = false,
  confirmBusyLabel,
  busy = false,
  zIndex = 250,
}: MargoConfirmDialogProps) {
  const [mounted, setMounted] = useState(false)
  const titleId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)

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
      if (e.key === 'Escape' && !busy) onOpenChange(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, busy, onOpenChange])

  useEffect(() => {
    if (open) cancelRef.current?.focus()
  }, [open])

  if (!open || !mounted) return null

  const reducedMotion =
    typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return createPortal(
    <div
      className="margo-confirm-dialog"
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'max(16px, env(safe-area-inset-top, 0px)) 16px max(16px, env(safe-area-inset-bottom, 0px))',
        boxSizing: 'border-box',
        background: SCRIM,
        animation: reducedMotion ? 'none' : 'margo-confirm-fade-in 160ms ease-out',
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="margo-confirm-dialog__panel"
        style={{
          width: '100%',
          maxWidth: 'min(340px, 100%)',
          background: 'var(--surface-2, #141318)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '20px 18px 16px',
          boxShadow: '0 20px 48px rgba(0,0,0,0.55)',
          animation: reducedMotion ? 'none' : 'margo-confirm-scale-in 180ms ease-out',
        }}
      >
        <p
          id={titleId}
          style={{
            margin: '0 0 12px',
            fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--text)',
            lineHeight: 1.35,
          }}
        >
          {title}
        </p>
        {children ? (
          <div className="margo-confirm-dialog__body" style={{ marginBottom: '16px' }}>
            {children}
          </div>
        ) : null}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          <button
            ref={cancelRef}
            type="button"
            className="margo-lb-owner-sheet__btn margo-lb-owner-sheet__btn--ghost"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="margo-lb-owner-sheet__btn margo-lb-owner-sheet__btn--danger"
            disabled={confirmDisabled || busy}
            onClick={() => void onConfirm()}
          >
            {busy && confirmBusyLabel ? confirmBusyLabel : confirmLabel}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes margo-confirm-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes margo-confirm-scale-in {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .margo-confirm-dialog, .margo-confirm-dialog__panel {
            animation: none !important;
          }
        }
      `}</style>
    </div>,
    document.body,
  )
}
