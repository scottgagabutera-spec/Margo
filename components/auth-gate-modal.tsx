'use client'
import { useState, useEffect } from 'react'
import { AuthForm } from '@/components/auth-form'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { AuthSheetCard, AuthSheetScrim } from '@/components/auth-sheet-frame'

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
  const [mode, setMode] = useState<'signup' | 'signin'>('signin')
  const { authReturnTo } = useAuthGate()

  useEffect(() => {
    if (open) setMode('signin')
  }, [open])

  if (!open) return null

  return (
    <AuthSheetScrim
      className="margo-auth-sheet-scrim"
      onScrimClick={() => onOpenChange(false)}
    >
      <div data-margo-auth-gate-modal="">
        <AuthSheetCard onClose={() => onOpenChange(false)} aria-label={mode === 'signup' ? 'Create account' : 'Sign in'}>
          <AuthForm
            mode={mode}
            onSuccess={() => onOpenChange(false)}
            onSwitchMode={setMode}
            oauthReturnTo={authReturnTo}
            externalError={externalError}
          />

          <button
            type="button"
            className="margo-auth-maybe-later"
            onClick={() => onOpenChange(false)}
          >
            Maybe later
          </button>
        </AuthSheetCard>
      </div>
    </AuthSheetScrim>
  )
}
