'use client'
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import {
  createClient,
  setBrowserAccessToken,
  setOnSessionInvalid,
} from '@/lib/supabase/client'
import { clearLegacyAuthStorage } from '@/lib/supabase/clear-legacy-auth-storage'
import {
  broadcastSessionChanged,
  subscribeAuthBroadcast,
} from '@/lib/supabase/auth-broadcast'
import type { User } from '@supabase/supabase-js'
import { AuthGateModal } from '@/components/auth-gate-modal'

const supabase = createClient()

type RehydrateOptions = {
  /**
   * Soft (focus / cross-tab): only clear UI on HTTP 401.
   * Thrown fetch errors and other non-OK statuses leave UI alone.
   * Hard (boot / explicit): non-OK or throw → signed-out UI.
   */
  soft?: boolean
}

interface AuthGateContextValue {
  user: User | null
  loading: boolean
  /** True when the signed-in user has an email/password identity. */
  hasPasswordAuth: boolean
  requireAuth: () => boolean
  /** Re-read httpOnly session → memory access token (after login/logout). */
  rehydrate: (opts?: RehydrateOptions) => Promise<void>
}

const AuthGateContext = createContext<AuthGateContextValue | null>(null)

/**
 * Auth core: hydrate from GET /api/auth/me (access_token only).
 * Refresh token never enters JS — stays in httpOnly cookies.
 * Multi-tab: BroadcastChannel + soft rehydrate on focus/visibility.
 */
export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasPasswordAuth, setHasPasswordAuth] = useState(false)
  const [gateOpen, setGateOpen] = useState(false)
  const userRef = useRef<User | null>(null)
  const applyingRemoteRef = useRef(false)
  userRef.current = user

  const applyAuthPayload = useCallback((body: {
    user?: { id: string; email?: string | null; is_anonymous?: boolean } | null
    access_token?: string
    has_password_auth?: boolean
  } | null) => {
    if (body?.access_token && body?.user) {
      setBrowserAccessToken(body.access_token)
      setUser({
        id: body.user.id,
        email: body.user.email ?? undefined,
        is_anonymous: body.user.is_anonymous,
      } as User)
      setHasPasswordAuth(body.has_password_auth === true)
      setGateOpen(false)
      return
    }
    setBrowserAccessToken(null)
    setUser(null)
    setHasPasswordAuth(false)
  }, [])

  const rehydrate = useCallback(async (opts?: RehydrateOptions) => {
    // Always wipe readable legacy auth material before /me (shadowing fix).
    clearLegacyAuthStorage()
    const soft = opts?.soft === true
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })

      // Genuinely signed out — cookies absent/invalid.
      if (res.status === 401) {
        applyAuthPayload(null)
        return
      }

      if (!res.ok) {
        // Soft path: leave UI alone on 5xx / unexpected status.
        if (soft) return
        applyAuthPayload(null)
        return
      }

      const body = await res.json()
      const hadUser = !!userRef.current
      applyAuthPayload(body)

      // Announce new session to other tabs (password login, OAuth return boot).
      // Skip when applying a peer's session-changed (no broadcast loop).
      if (
        !soft &&
        !applyingRemoteRef.current &&
        !hadUser &&
        body?.access_token &&
        body?.user
      ) {
        broadcastSessionChanged()
      }
    } catch (err) {
      // Soft path: thrown fetch (network) — leave UI alone.
      if (soft) {
        console.error('[auth core] soft /api/auth/me failed (UI unchanged):', err)
        return
      }
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

  // Cross-tab sync: clear UI on peer logout; soft-rehydrate on peer login.
  useEffect(() => {
    return subscribeAuthBroadcast((message) => {
      if (message.type === 'session-cleared') {
        // Cookies already cleared by the peer — do not call signOutBrowser again.
        applyAuthPayload(null)
        return
      }
      if (message.type === 'session-changed') {
        applyingRemoteRef.current = true
        void rehydrate({ soft: true }).finally(() => {
          applyingRemoteRef.current = false
        })
      }
    })
  }, [applyAuthPayload, rehydrate])

  // Safety net when BroadcastChannel is missed or unavailable.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const schedule = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        void rehydrate({ soft: true })
      }, 300)
    }
    const onFocus = () => schedule()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') schedule()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      if (timer) clearTimeout(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [rehydrate])

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
    <AuthGateContext.Provider value={{ user, loading, hasPasswordAuth, requireAuth, rehydrate }}>
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
