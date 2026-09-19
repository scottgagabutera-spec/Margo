/**
 * Margo Engagement — Session & Actor Identity
 * @see docs/TARGET_ARCHITECTURE_AUDIO_ENGAGEMENT.md Section 3.1
 *
 * margoSessionId  — persistent UUID v4, created once, survives forever.
 *                   Used for: play dedup, view dedup, rate limits, analytics.
 *                   Never PII. Safe for anonymous users and future auth migration.
 *
 */

// ── UUID v4 generator (no external dependency) ────────────────────

function uuidv4(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// ── Session ID ────────────────────────────────────────────────────

const SESSION_KEY = 'margoSessionId'

/**
 * Get the persistent session ID for this device/browser.
 * Creates one on first call and stores it in localStorage.
 * Returns a stable fallback string in SSR environments.
 */
export function getMargoSessionId(): string {
  if (typeof window === 'undefined') return 'ssr-session'
  try {
    const existing = localStorage.getItem(SESSION_KEY)
    if (existing && existing.length > 10) return existing
    const id = uuidv4()
    localStorage.setItem(SESSION_KEY, id)
    return id
  } catch {
    // localStorage blocked (private browsing extreme mode, etc.)
    return 'blocked-session'
  }
}
