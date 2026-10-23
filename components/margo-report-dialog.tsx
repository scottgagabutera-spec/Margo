'use client'

import { useEffect, useId, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from '@/components/icons'

export type MargoReportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  children: ReactNode
  closeDisabled?: boolean
  zIndex?: number
}

const SCRIM = 'var(--surface, #0F0E13)'

type ViewportBox = {
  top: number
  left: number
  width: number
  height: number
}

function readVisualViewportBox(): ViewportBox {
  if (typeof window === 'undefined') {
    return { top: 0, left: 0, width: 390, height: 844 }
  }
  const vv = window.visualViewport
  if (!vv) {
    return {
      top: 0,
      left: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    }
  }
  return {
    top: vv.offsetTop,
    left: vv.offsetLeft,
    width: vv.width,
    height: vv.height,
  }
}

/**
 * Centered solid report card — same family as delete confirm; tracks visualViewport
 * so the card and Submit stay visible when the keyboard is open.
 */
export function MargoReportDialog({
  open,
  onOpenChange,
  title = 'Report',
  children,
  closeDisabled = false,
  zIndex = 240,
}: MargoReportDialogProps) {
  const [mounted, setMounted] = useState(false)
  const [vvBox, setVvBox] = useState<ViewportBox>(() => readVisualViewportBox())
  const titleId = useId()

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
    const measure = () => setVvBox(readVisualViewportBox())
    measure()
    const vv = window.visualViewport
    vv?.addEventListener('resize', measure)
    vv?.addEventListener('scroll', measure)
    window.addEventListener('resize', measure)
    return () => {
      vv?.removeEventListener('resize', measure)
      vv?.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !closeDisabled) onOpenChange(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, closeDisabled, onOpenChange])

  if (!open || !mounted) return null

  const reducedMotion =
    typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const pad = 16
  const maxPanelHeight = Math.max(200, vvBox.height - pad * 2)

  return createPortal(
    <div
      className="margo-report-dialog"
      role="presentation"
      style={{
        position: 'fixed',
        top: vvBox.top,
        left: vvBox.left,
        width: vvBox.width,
        height: vvBox.height,
        zIndex,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: `${pad}px`,
        background: SCRIM,
        animation: reducedMotion ? 'none' : 'margo-report-dialog-fade-in 160ms ease-out',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="margo-report-dialog__panel"
        style={{
          width: '100%',
          maxWidth: 'min(340px, 100%)',
          maxHeight: maxPanelHeight,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface-2, #141318)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          boxShadow: '0 20px 48px rgba(0,0,0,0.55)',
          overflow: 'hidden',
          animation: reducedMotion ? 'none' : 'margo-report-dialog-scale-in 180ms ease-out',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '16px 16px 8px',
            flexShrink: 0,
          }}
        >
          <p
            id={titleId}
            style={{
              margin: 0,
              fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
              fontSize: '1rem',
              fontWeight: 600,
              color: 'var(--text)',
              lineHeight: 1.35,
            }}
          >
            {title}
          </p>
          <button
            type="button"
            aria-label="Close"
            disabled={closeDisabled}
            onClick={() => onOpenChange(false)}
            style={{
              width: 'var(--margo-touch-min, 44px)',
              height: 'var(--margo-touch-min, 44px)',
              margin: '-6px -8px -6px 0',
              borderRadius: '50%',
              border: '1px solid var(--border-hi, var(--border))',
              background: 'rgba(255,255,255,0.05)',
              cursor: closeDisabled ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              opacity: closeDisabled ? 0.5 : 1,
            }}
          >
            <CloseIcon size={14} color="var(--text-secondary)" />
          </button>
        </div>
        <div
          className="margo-report-dialog__body"
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '0 16px 16px',
          }}
        >
          {children}
        </div>
      </div>
      <style>{`
        @keyframes margo-report-dialog-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes margo-report-dialog-scale-in {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .margo-report-dialog, .margo-report-dialog__panel {
            animation: none !important;
          }
        }
      `}</style>
    </div>,
    document.body,
  )
}
