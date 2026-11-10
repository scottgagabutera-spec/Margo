'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CheckIcon } from '@/components/icons'

type Phase = 'confirm' | 'loading' | 'success' | 'error'

export function AdminApplicationConfirmModal({
  open,
  title,
  body,
  confirmLabel,
  confirmTone,
  rejectReason,
  onRejectReason,
  phase,
  errorMessage,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  confirmTone: 'gold' | 'danger'
  rejectReason?: string
  onRejectReason?: (v: string) => void
  phase: Phase
  errorMessage?: string | null
  onConfirm: () => void
  onCancel: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const prevFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    prevFocus.current = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = window.setTimeout(() => panelRef.current?.querySelector<HTMLElement>('button')?.focus(), 0)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(t)
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
      prevFocus.current?.focus()
    }
  }, [open, onCancel])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2400,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onCancel}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-app-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(400px, 100%)',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '20px 20px 18px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
        }}
      >
        <h2
          id="admin-app-modal-title"
          style={{
            fontFamily: 'var(--font-lora), serif',
            fontSize: '1rem',
            fontWeight: 500,
            color: 'var(--text)',
            margin: '0 0 8px',
          }}
        >
          {title}
        </h2>
        <p style={{ fontFamily: 'var(--font-lora), serif', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.55, margin: '0 0 16px' }}>
          {body}
        </p>
        {onRejectReason ? (
          <textarea
            value={rejectReason}
            onChange={(e) => onRejectReason(e.target.value)}
            placeholder="Optional note to the artist"
            rows={3}
            style={{
              width: '100%',
              marginBottom: '14px',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontFamily: 'var(--font-lora), serif',
              fontSize: '0.8rem',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        ) : null}
        {phase === 'error' && errorMessage ? (
          <p style={{ color: '#ff6060', fontSize: '0.75rem', marginBottom: '12px' }}>{errorMessage}</p>
        ) : null}
        {phase === 'success' ? (
          <p style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#5fd68a', fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px' }}>
            <CheckIcon size={18} color="#5fd68a" />
            {confirmTone === 'gold' ? 'Approved' : 'Rejected'}
          </p>
        ) : (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={phase === 'loading'}
              onClick={onConfirm}
              style={{
                flex: 1,
                minHeight: '44px',
                padding: '0 16px',
                borderRadius: '10px',
                border: 'none',
                fontFamily: 'var(--font-lora), serif',
                fontWeight: 700,
                fontSize: '0.75rem',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                cursor: phase === 'loading' ? 'default' : 'pointer',
                opacity: phase === 'loading' ? 0.65 : 1,
                background: confirmTone === 'gold' ? 'var(--gold)' : 'transparent',
                color: confirmTone === 'gold' ? 'var(--bg)' : '#ff6060',
                borderWidth: confirmTone === 'gold' ? 0 : 1,
                borderStyle: 'solid',
                borderColor: 'rgba(255,96,96,0.45)',
              }}
            >
              {phase === 'loading' ? 'Working…' : confirmLabel}
            </button>
            <button
              type="button"
              disabled={phase === 'loading'}
              onClick={onCancel}
              style={{
                minHeight: '44px',
                padding: '0 16px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-lora), serif',
                fontSize: '0.75rem',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
