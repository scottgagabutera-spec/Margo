/**
 * Song Atmosphere — the physical room feeling while a catalog song plays.
 * Completely separate from lyric/Moment vibe (CHILL, HYPE, Heartbreak, …).
 *
 * Stored only on `songs.atmosphere`. Posts and Moments join it at read time.
 * NULL / unknown → Still (no room motion). Existing songs stay Still.
 */

export const ATMOSPHERE_IDS = ['still', 'breath', 'drift', 'pulse', 'weight'] as const

export type AtmosphereId = (typeof ATMOSPHERE_IDS)[number]

/** Values that may be persisted on songs.atmosphere (Still is NULL). */
export type AtmosphereColumn = Exclude<AtmosphereId, 'still'>

export const ATMOSPHERE_OPTIONS: { id: AtmosphereId; label: string; hint: string }[] = [
  { id: 'still', label: 'Still', hint: 'No room motion.' },
  { id: 'breath', label: 'Breath', hint: 'Open mix, slow inhale, lots of space between hits.' },
  { id: 'drift', label: 'Drift', hint: 'Forward motion. The track keeps traveling.' },
  { id: 'pulse', label: 'Pulse', hint: 'Tight rhythm. Hits, then a rest, then another hit.' },
  { id: 'weight', label: 'Weight', hint: 'Heavy low end. The mix sits on the floor.' },
]

/** Live song fields joined onto posts / post_lines. Never copied onto those rows. */
export const SONG_POST_EMBED = 'audio_url, artwork_url, is_ai_generated, atmosphere'

export function parseAtmosphere(raw: string | null | undefined): AtmosphereId {
  if (raw === 'breath' || raw === 'drift' || raw === 'pulse' || raw === 'weight') return raw
  return 'still'
}

/** Studio save: Still writes NULL so untouched and reset songs look the same. */
export function toAtmosphereColumn(id: AtmosphereId): AtmosphereColumn | null {
  return id === 'still' ? null : id
}

export function isLivingAtmosphere(id: AtmosphereId): boolean {
  return id !== 'still'
}

/** Engine / queue value: living id or null (Still). */
export function livingAtmosphereOrNull(raw: string | null | undefined): AtmosphereColumn | null {
  return toAtmosphereColumn(parseAtmosphere(raw))
}
