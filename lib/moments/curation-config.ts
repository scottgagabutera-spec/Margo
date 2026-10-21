/** Server-side feature flag — when false, curated moments are ignored and OpenAI is not called. */
export function isMomentsCurationEnabled(): boolean {
  return process.env.MOMENTS_CURATION_ENABLED === 'true'
}

/** Browser flag — set NEXT_PUBLIC_MOMENTS_CURATION_ENABLED=true when server curation is on. */
export function isMomentsCurationClientEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MOMENTS_CURATION_ENABLED === 'true'
}

/** Approximate USD per gpt-4o-mini curation call (prompt + completion). */
export const ESTIMATED_CURATION_USD = 0.002

export function getDailyCurationUsdCap(): number {
  const raw = process.env.MOMENTS_CURATION_DAILY_USD_CAP
  if (!raw) return 5
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 5
}

export function getMaxCurationsPerUserPerDay(): number {
  const raw = process.env.MOMENTS_CURATION_MAX_PER_USER_DAY
  if (!raw) return 20
  const n = Number(parseInt(raw, 10))
  return Number.isFinite(n) && n > 0 ? n : 20
}

export function getMaxCurationsPerSongPerDay(): number {
  const raw = process.env.MOMENTS_CURATION_MAX_PER_SONG_DAY
  if (!raw) return 3
  const n = Number(parseInt(raw, 10))
  return Number.isFinite(n) && n > 0 ? n : 3
}
