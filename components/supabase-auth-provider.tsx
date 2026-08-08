'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  createClient,
  setBrowserAccessToken,
  setOnSessionInvalid,
} from '@/lib/supabase/client'
import { clearLegacyAuthStorage } from '@/lib/supabase/clear-legacy-auth-storage'
import type { User } from '@supabase/supabase-js'
import { AuthGateModal } from '@/components/auth-gate-modal'

const supabase = createClient()

interface AuthGateContextValue {
  user: User | null
  loading: boolean
  requireAuth: () => boolean
  /** Re-read httpOnly session → memory access token (after login/logout). */
  rehydrate: () => Promise<void>
}

const AuthGateContext = createContext<AuthGateContextValue | null>(null)

/**
 * Auth core: hydrate from GET /api/auth/me (access_token only).
 * Refresh token never enters JS — stays in httpOnly cookies.
 */
export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [gateOpen, setGateOpen] = useState(false)

  const applyAuthPayload = useCallback((body: {
    user?: { id: string; email?: string | null; is_anonymous?: boolean } | null
    access_token?: string
  } | null) => {
    if (body?.access_token && body?.user) {
      setBrowserAccessToken(body.access_token)
      setUser({
        id: body.user.id,
        email: body.user.email ?? undefined,
        is_anonymous: body.user.is_anonymous,
      } as User)
      setGateOpen(false)
      return
    }
    setBrowserAccessToken(null)
    setUser(null)
  }, [])

  const rehydrate = useCallback(async () => {
    // Always wipe readable legacy auth material before /me (shadowing fix).
    clearLegacyAuthStorage()
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      if (!res.ok) {
        applyAuthPayload(null)
        return
      }
      const body = await res.json()
      applyAuthPayload(body)
    } catch (err) {
      console.error('[auth core] /api/auth/me failed:', err)
      applyAuthPayload(null)
    }
  }, [applyAuthPayload])

  // Register once per mount; clear on unmount so refresh-failure never hits a stale closure.
  useEffect(() => {
    setOnSessionInvalid(() => {
      applyAuthPayload(null)
    })
    return () => setOnSessionInvalid(null)
  }, [applyAuthPayload])

  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        await rehydrate()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void boot()

    // Optional safety net: if GoTrue emits a user (e.g. leftover), prefer /me.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      // Intentionally empty — session lives in httpOnly cookies + memory bearer.
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [rehydrate])

  const requireAuth = useCallback((): boolean => {
    if (loading) return false
    if (user) return true
    setGateOpen(true)
    return false
  }, [user, loading])

  return (
    <AuthGateContext.Provider value={{ user, loading, requireAuth, rehydrate }}>
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
