'use client'
import { useState, useEffect } from 'react'
import { AuthForm } from '@/components/auth-form'
import { CloseIcon } from '@/components/icons'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { TYPE, UI_FONT } from '@/lib/fonts'

const font = UI_FONT

interface AuthGateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  externalError?: string | null
}

/**
 * Dismissible sign-up/sign-in prompt shown by requireAuth().
 * On success, Compose consumes its pending action via sessionStorage resume.
 */
export function AuthGateModal({ open, onOpenChange, externalError }: AuthGateModalProps) {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup')
  const { authReturnTo } = useAuthGate()

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
          <CloseIcon size={14} color="var(--text-secondary)" />
        </button>

        <AuthForm
          mode={mode}
          onSuccess={() => onOpenChange(false)}
          onSwitchMode={setMode}
          oauthReturnTo={authReturnTo}
          externalError={externalError}
        />

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          style={{
            display: 'block', width: '100%', textAlign: 'center',
            marginTop: '20px', padding: '8px', minHeight: '44px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: font, fontSize: TYPE.secondary, color: 'var(--text-secondary)',
          }}
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}