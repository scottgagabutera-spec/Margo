'use client'

import { AuthGateModal } from '@/components/auth-gate-modal'
import { useAuthGate } from '@/components/supabase-auth-provider'

/**
 * Renders the auth gate inside IdentityProvider so AuthForm can call
 * useIdentity (the provider itself sits above IdentityProvider).
 */
export function AuthGateHost() {
  const { authGateOpen, authGateExternalError, setAuthGateOpen } = useAuthGate()
  return (
    <AuthGateModal
      open={authGateOpen}
      onOpenChange={setAuthGateOpen}
      externalError={authGateExternalError}
    />
  )
}
