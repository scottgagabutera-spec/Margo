'use client'

import { useEffect, useRef } from 'react'
import { useAuthGate } from '@/components/supabase-auth-provider'

/**
 * Event-based welcome series tick — runs after sign-in and when the tab returns.
 * Cheaper than cron: only active users, aligned with app open.
 */
export function WelcomeSeriesSync() {
  const { user, loading } = useAuthGate()
  const inflight = useRef(false)
  const lastAt = useRef(0)

  useEffect(() => {
    if (loading || !user || user.is_anonymous) return

    const run = async () => {
      const now = Date.now()
      if (inflight.current || now - lastAt.current < 30_000) return
      inflight.current = true
      lastAt.current = now
      try {
        await fetch('/api/welcome-series/sync', { method: 'POST', credentials: 'include' })
      } catch {
        // best-effort
      } finally {
        inflight.current = false
      }
    }

    void run()

    const onVisible = () => {
      if (document.visibilityState === 'visible') void run()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pageshow', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pageshow', onVisible)
    }
  }, [loading, user?.id, user?.is_anonymous])

  return null
}
