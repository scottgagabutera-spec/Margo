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

/** Living effects only — export Effect picker never cycles through Still. */
export const LIVING_ATMOSPHERE_IDS = ['breath', 'drift', 'pulse', 'weight'] as const

export type LivingAtmosphereId = (typeof LIVING_ATMOSPHERE_IDS)[number]

/** Loop durations (seconds) — keep CSS + canvas in sync. */
export const ATMOSPHERE_TIMING = {
  breath: 8.2,
  drift: 5.5,
  pulse: 1.875,
  weightFloor: 11,
} as const

export const ATMOSPHERE_OPTIONS: { id: AtmosphereId; label: string; hint: string }[] = [
  { id: 'still', label: 'None', hint: 'No motion — color only.' },
  {
    id: 'breath',
    label: 'Slow Rise',
    hint: 'The card gently swells in and out, like a deep breath.',
  },
  {
    id: 'drift',
    label: 'Rolling Wave',
    hint: 'Waves keep rolling across — never stops moving forward.',
  },
  {
    id: 'pulse',
    label: 'On the Beat',
    hint: 'Rhythmic hits locked to the groove — bass, dembow, reggaeton energy.',
  },
  {
    id: 'weight',
    label: 'Falling Tears',
    hint: 'Golden drops fall, stretch, and pool at the bottom.',
  },
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

export function isLivingAtmosphere(id: AtmosphereId): id is LivingAtmosphereId {
  return id !== 'still'
}

/** Engine / queue value: living id or null (Still). */
export function livingAtmosphereOrNull(raw: string | null | undefined): AtmosphereColumn | null {
  return toAtmosphereColumn(parseAtmosphere(raw))
}

/** @deprecated Prefer cycleLivingAtmosphere for export Effect control. */
export function cycleExportAtmosphere(id: AtmosphereId): AtmosphereId {
  const idx = ATMOSPHERE_IDS.indexOf(id)
  const next = ATMOSPHERE_IDS[(idx + 1) % ATMOSPHERE_IDS.length]
  return next ?? 'still'
}

/** Export Effect column — cycles living personalities only (never lands on Still). */
export function cycleLivingAtmosphere(id: AtmosphereId): LivingAtmosphereId {
  if (!isLivingAtmosphere(id)) return LIVING_ATMOSPHERE_IDS[0]
  const idx = LIVING_ATMOSPHERE_IDS.indexOf(id)
  return LIVING_ATMOSPHERE_IDS[(idx + 1) % LIVING_ATMOSPHERE_IDS.length]
}

export function exportAtmosphereLabel(id: AtmosphereId): string {
  if (id === 'still') return 'None'
  return ATMOSPHERE_OPTIONS.find((o) => o.id === id)?.label ?? 'None'
}

export function exportAtmosphereHint(id: AtmosphereId): string {
  return ATMOSPHERE_OPTIONS.find((o) => o.id === id)?.hint ?? ''
}
