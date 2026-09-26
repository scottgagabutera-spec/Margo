'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { UI_FONT } from '@/lib/fonts'

const font = UI_FONT

export type MargoActionSheetTone = 'default' | 'destructive' | 'cancel'

export interface MargoActionSheetAction {
  id: string
  label: string
  tone?: MargoActionSheetTone
  disabled?: boolean
  onSelect: () => void
}

export interface MargoActionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Short title above actions (optional). */
  title?: string
  /** One line of context under the title (optional). */
  message?: ReactNode
  actions: MargoActionSheetAction[]
  zIndex?: number
}

/**
 * Bottom action sheet — contextual choices before destructive or ambiguous taps.
 * Portaled; safe-area aware; cancel is always last when provided.
 */
export function MargoActionSheet({
  open,
  onOpenChange,
  title,
  message,
  actions,
  zIndex = 240,
}: MargoActionSheetProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open || !mounted) return null

  const close = () => onOpenChange(false)

  return createPortal(
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      <button
        type="button"
        aria-label="Dismiss"
        onClick={close}
        style={{
          position: 'absolute',
          inset: 0,
          border: 'none',
          background: 'var(--margo-scrim)',
          cursor: 'default',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Actions'}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          zIndex: 1,
          margin: '0 12px',
          marginBottom: 'calc(12px + env(safe-area-inset-bottom, 0px) + var(--margo-tabbar-h, 0px))',
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid var(--border-hi)',
          background: 'var(--surface)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.45)',
        }}
      >
        {(title || message) && (
          <div style={{
            padding: '16px 18px 12px',
            borderBottom: '1px solid var(--border)',
            textAlign: 'center',
          }}>
            {title && (
              <p style={{
                fontFamily: font,
                fontSize: '0.62rem',
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                margin: '0 0 6px',
              }}>
                {title}
              </p>
            )}
            {message && (
              <div style={{
                fontFamily: font,
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.45,
              }}>
                {message}
              </div>
            )}
          </div>
        )}
        <div role="group">
          {actions.map((action, index) => {
            const tone = action.tone ?? 'default'
            const isCancel = tone === 'cancel'
            const isDestructive = tone === 'destructive'
            return (
              <button
                key={action.id}
                type="button"
                disabled={action.disabled}
                onClick={() => {
                  if (action.disabled) return
                  action.onSelect()
                  close()
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  minHeight: 'var(--margo-touch-min)',
                  padding: '14px 18px',
                  border: 'none',
                  borderTop: index > 0 ? '1px solid var(--border)' : 'none',
                  background: 'transparent',
                  fontFamily: font,
                  fontSize: isCancel ? '0.72rem' : '0.78rem',
                  fontWeight: isCancel ? 600 : 700,
                  letterSpacing: isCancel ? '0.06em' : '0.02em',
                  textTransform: isCancel ? 'uppercase' : 'none',
                  color: isDestructive
                    ? 'var(--text-secondary)'
                    : isCancel
                      ? 'var(--text-muted)'
                      : 'var(--gold)',
                  cursor: action.disabled ? 'not-allowed' : 'pointer',
                  opacity: action.disabled ? 0.45 : 1,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {action.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>,
    document.body,
  )
}
