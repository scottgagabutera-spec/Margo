/**
 * Margo Engagement — last_seen_at heartbeat
 *
 * Calls touch_last_seen() RPC after Identity has ensured a profiles row.
 * Client mirrors the server's ~15m throttle via localStorage so focus /
 * visibility events do not spam PostgREST. localStorage is written only
 * after a successful RPC (server no-ops when still fresh; client still
 * stamps so subsequent focus events stay quiet for the window).
 */

import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

const THROTTLE_MS = 15 * 60 * 1000
const STORAGE_KEY_PREFIX = 'margoLastSeenAt:'

function storageKey(userId: string): string {
  return STORAGE_KEY_PREFIX + userId
}

function isClientFresh(userId: string): boolean {
  if (typeof window === 'undefined') return true
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return false
    const ts = Number(raw)
    if (!Number.isFinite(ts)) return false
    return Date.now() - ts < THROTTLE_MS
  } catch {
    return false
  }
}

function markClientTouched(userId: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(storageKey(userId), String(Date.now()))
  } catch {
    // localStorage blocked — server throttle still applies
  }
}

/**
 * Soft-fail heartbeat. Safe to call from mount, window focus, and
 * visibilitychange → visible. Never throws; never blocks auth/UI.
 */
export async function touchLastSeen(userId: string): Promise<void> {
  if (!userId) return
  if (isClientFresh(userId)) return

  try {
    const { error } = await supabase.rpc('touch_last_seen')
    if (error) {
      console.error('[touchLastSeen] RPC failed:', error.message, {
        code: error.code,
      })
      return
    }
    markClientTouched(userId)
  } catch (e) {
    console.error('[touchLastSeen] unexpected error:', e)
  }
}
