/**
 * Margo Engagement — Play Qualification
 * @see docs/TARGET_ARCHITECTURE_AUDIO_ENGAGEMENT.md Section 3.2
 *
 * Rules:
 * - Only full karaoke listens count (never snippets)
 * - Minimum: 30 seconds continuous OR 50% of track if duration < 60s
 * - Dedup: engagement/plays/{songId}/{sessionId} — one write per session ever
 * - Aggregate: songStats/{songId}/plays incremented atomically
 * - Never increments songs/{id}/plays directly (legacy field frozen)
 */

import { getMargoSessionId } from './session'

// ── Qualification threshold ───────────────────────────────────────

/**
 * Returns the number of seconds needed to qualify a play.
 * 30s flat, or 50% of track duration if track is under 60s.
 */
export function getPlayThresholdSec(durationSec: number): number {
  if (durationSec > 0 && durationSec < 60) {
    return durationSec * 0.5
  }
  return 30
}

// ── Record qualified play ─────────────────────────────────────────

/**
 * Record a qualified play for a song.
 * Safe to call multiple times — Firebase dedup prevents double-counting.
 *
 * Flow:
 * 1. Check engagement/plays/{songId}/{sessionId} — if exists, skip
 * 2. Set the flag
 * 3. runTransaction on songStats/{songId}/plays to increment
 */
export async function recordQualifiedPlay(songId: string): Promise<void> {
  if (!songId) return
  const sessionId = getMargoSessionId()
  if (sessionId === 'ssr-session' || sessionId === 'blocked-session') return

  try {
    const { getDatabase, ref, runTransaction } = await import('firebase/database')
    const { app } = await import('@/lib/firebase')
    if (!app) return
    const db = getDatabase(app)

    const dedupRef = ref(db, `engagement/plays/${songId}/${sessionId}`)
    const dedupResult = await runTransaction(dedupRef, (current) => {
      if (current) return
      return { qualifiedAt: Date.now() }
    })
    if (!dedupResult.committed) return

    const statsRef = ref(db, `songStats/${songId}/plays`)
    await runTransaction(statsRef, (current) => {
      return (current || 0) + 1
    })
  } catch {
    // Non-critical — never throw, never block playback
  }
}

export async function recordSnippetPlay(songId: string): Promise<void> {
  if (!songId) return
  const sessionId = getMargoSessionId()
  if (sessionId === 'ssr-session' || sessionId === 'blocked-session') return

  try {
    const { getDatabase, ref, runTransaction } = await import('firebase/database')
    const { app } = await import('@/lib/firebase')
    if (!app) return
    const db = getDatabase(app)

    const dedupRef = ref(db, `engagement/snippets/${songId}/${sessionId}`)
    const dedupResult = await runTransaction(dedupRef, (current) => {
      if (current) return
      return { qualifiedAt: Date.now() }
    })
    if (!dedupResult.committed) return

    const statsRef = ref(db, `songStats/${songId}/snippetPlays`)
    await runTransaction(statsRef, (current) => {
      return (current || 0) + 1
    })
  } catch {
    // Non-critical — never throw, never block playback
  }
}
