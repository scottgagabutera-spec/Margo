'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { AuthGateModal } from '@/components/auth-gate-modal'

interface AuthGateContextValue {
  user: User | null
  loading: boolean
  requireAuth: () => boolean
}

const AuthGateContext = createContext<AuthGateContextValue | null>(null)

/**
 * Mount once at the root of the app (app/layout.tsx), alongside the
 * existing Firebase AuthProvider during the migration window.
 *
 * No anonymous session is created anymore â€” per the "giant way" gate
 * decision, browsing/search/compose flow/snippet playback stay fully
 * open with no Supabase user at all. The first time someone triggers a
 * gated action (post, resonate, lyric back, card export, full song
 * play), requireAuth() opens a dismissible sign-up/sign-in modal
 * instead of letting the action through. Dismissing it ("Maybe Later"
 * or the X) simply cancels that action â€” nothing is written.
 *
 * A signed-in user's session persists via Supabase's own localStorage
 * handling, so returning visitors are recognized automatically on
 * load without re-authenticating â€” this provider's session check on
 * mount + onAuthStateChange listener below is what surfaces that.
 */
export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [gateOpen, setGateOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      setUser(session?.user ?? null)
      // A successful sign-up/sign-in closes the gate automatically,
      // wherever it was opened from.
      if (session?.user) setGateOpen(false)
    })

    return () => { cancelled = true; subscription.unsubscribe() }
  }, [])

  // Call before any gated action. Returns true immediately if already
  // signed in. Otherwise opens the modal and returns false â€” the
  // caller should stop the action right there; requireAuth() does not
  // block/await the sign-in, since the modal itself is the retry path.
  const requireAuth = useCallback((): boolean => {
    if (loading) return false // session check not resolved yet â€” fail closed, not open
    if (user) return true
    setGateOpen(true)
    return false
  }, [user, loading])

  return (
    <AuthGateContext.Provider value={{ user, loading, requireAuth }}>
      {children}
      <AuthGateModal open={gateOpen} onOpenChange={setGateOpen} />
    </AuthGateContext.Provider>
  )
}

export function useAuthGate() {
  const ctx = useContext(AuthGateContext)
  if (!ctx) throw new Error('useAuthGate must be used within SupabaseAuthProvider')
  return ctx
}