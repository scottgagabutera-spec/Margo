'use client'
import { useState, useEffect } from 'react'
import { AuthForm } from '@/components/auth-form'

const font = 'var(--font-lora), serif'

interface AuthGateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Dismissible sign-up/sign-in prompt shown by requireAuth() (see
 * supabase-auth-provider.tsx) whenever someone taps a gated action —
 * post, resonate, lyric back, card export, or full song play — without
 * an account. "Maybe Later" and the X both simply close the modal;
 * neither retries the original action, matching the simplest version
 * of this flow (the person just taps again if they change their mind).
 */
export function AuthGateModal({ open, onOpenChange }: AuthGateModalProps) {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup')

  // Reset to signup each time the modal opens fresh.
  useEffect(() => {
    if (open) setMode('signup')
  }, [open])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={() => onOpenChange(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(7,6,10,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px', boxSizing: 'border-box',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', width: '100%', maxWidth: '420px',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '24px', padding: '40px 28px 28px',
          boxSizing: 'border-box', maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={() => onOpenChange(false)}
          style={{
            position: 'absolute', top: '14px', right: '14px',
            width: '32px', height: '32px', minWidth: '44px', minHeight: '44px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.05)', border: 'none',
            borderRadius: '50%', cursor: 'pointer', boxSizing: 'border-box',
            transform: 'translate(6px, -6px)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1L13 13M13 1L1 13" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <AuthForm
          mode={mode}
          onSuccess={() => onOpenChange(false)}
          onSwitchMode={setMode}
        />

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          style={{
            display: 'block', width: '100%', textAlign: 'center',
            marginTop: '20px', padding: '8px', minHeight: '44px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: font, fontSize: '0.78rem', color: 'var(--text-3)',
          }}
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}