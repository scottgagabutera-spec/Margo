/**
 * Margo Engagement — Play Qualification
 * @see docs/TARGET_ARCHITECTURE_AUDIO_ENGAGEMENT.md Section 3.2
 *
 * Rules:
 * - Only full karaoke listens count (never snippets) — enforced by AudioEngine
 * - Minimum: 30 seconds (wall clock position) OR 50% of track if duration < 60s
 * - Dedup: song_plays PK (song_id, session_id) — one row per session ever
 * - Aggregate: song_stats.plays via on_song_play_change trigger (do not increment manually)
 */

import { createClient } from '@/lib/supabase/client'
import { getMargoSessionId } from './session'

const supabase = createClient()

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
 * Safe to call multiple times — primary key prevents double-counting.
 *
 * Flow:
 * 1. Insert song_plays { song_id, session_id }
 * 2. Unique violation (23505) = already counted for this session — ignore
 * 3. Trigger bumps song_stats.plays on successful insert
 */
export async function recordQualifiedPlay(songId: string): Promise<void> {
  if (!songId) return
  const sessionId = getMargoSessionId()
  if (sessionId === 'ssr-session' || sessionId === 'blocked-session') return

  try {
    const { error } = await supabase.from('song_plays').insert({
      song_id: songId,
      session_id: sessionId,
    })
    if (!error) return
    // Expected dedup — already recorded for this session
    if (error.code === '23505') return
    console.error('[recordQualifiedPlay] song_plays insert failed:', error.message, {
      code: error.code,
      songId,
    })
  } catch (e) {
    // Non-critical — never throw, never block playback
    console.error('[recordQualifiedPlay] unexpected error:', e)
  }
}

/**
 * Unused — AudioEngine never records snippet plays.
 * Kept as a no-op stub so old imports (if any) stay harmless; delete in a later cleanup.
 */
export async function recordSnippetPlay(_songId: string): Promise<void> {
  return
}
