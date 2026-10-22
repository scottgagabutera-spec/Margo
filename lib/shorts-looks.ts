import { stableHash32, utcDayKey } from './shorts-shelf-rotation.ts'

export type ShortsLookTier = 'free' | 'paid'
export type ShortsStageThemeId = 'gold' | 'blush' | 'sage' | 'dusk'
export type ShortsAtmosphereId = 'still' | 'breath' | 'drift' | 'pulse' | 'weight'

export type ShortsLook = {
  id: string
  label: string
  stageThemeId: ShortsStageThemeId
  atmosphereId: ShortsAtmosphereId
  tier: ShortsLookTier
  /** Relative weight per stored vibe key (uppercase, e.g. HOPE). */
  vibeWeights: Partial<Record<string, number>>
}

/** In-code registry — DB tier/paid flags can mirror this later. */
export const SHORTS_LOOKS: ShortsLook[] = [
  {
    id: 'gold-still',
    label: 'Gold',
    stageThemeId: 'gold',
    atmosphereId: 'still',
    tier: 'free',
    vibeWeights: { CHILL: 2, GRATEFUL: 2, NOSTALGIA: 1 },
  },
  {
    id: 'gold-breath',
    label: 'Gold · Slow Rise',
    stageThemeId: 'gold',
    atmosphereId: 'breath',
    tier: 'free',
    vibeWeights: { HOPE: 3, HEALING: 2, SPIRITUAL: 2, CHILL: 1 },
  },
  {
    id: 'blush-drift',
    label: 'Blush · Wave',
    stageThemeId: 'blush',
    atmosphereId: 'drift',
    tier: 'free',
    vibeWeights: { LOVE: 3, JOY: 2, NOSTALGIA: 2 },
  },
  {
    id: 'sage-breath',
    label: 'Sage · Slow Rise',
    stageThemeId: 'sage',
    atmosphereId: 'breath',
    tier: 'free',
    vibeWeights: { CHILL: 3, HOPE: 2, GRATEFUL: 2 },
  },
  {
    id: 'dusk-weight',
    label: 'Dusk · Falling',
    stageThemeId: 'dusk',
    atmosphereId: 'weight',
    tier: 'free',
    vibeWeights: { HEARTBREAK: 3, PAIN: 2, LONELINESS: 2, LOST: 2 },
  },
  {
    id: 'dusk-pulse',
    label: 'Dusk · Beat',
    stageThemeId: 'dusk',
    atmosphereId: 'pulse',
    tier: 'free',
    vibeWeights: { HYPE: 3, RAGE: 2, SENDIT: 2, LETOUT: 2, PROUD: 1 },
  },
  {
    id: 'gold-drift-paid',
    label: 'Gold · Wave (Studio)',
    stageThemeId: 'gold',
    atmosphereId: 'drift',
    tier: 'paid',
    vibeWeights: { PROUD: 2, HYPE: 1, JOY: 1 },
  },
]

function normalizeVibeKey(vibe: string | null | undefined): string {
  return (vibe || '').trim().toUpperCase() || 'IVORY'
}

function scoreLookForVibe(look: ShortsLook, vibeKey: string): number {
  return look.vibeWeights[vibeKey] ?? look.vibeWeights.IVORY ?? 0
}

/** Deterministic look for a catalog clip. */
export function pickShortsLook(
  songId: string,
  vibe: string | null | undefined,
  day: string = utcDayKey(new Date()),
): ShortsLook {
  const vibeKey = normalizeVibeKey(vibe)
  const scored = SHORTS_LOOKS.map((look) => ({
    look,
    score: scoreLookForVibe(look, vibeKey),
  }))
  const maxScore = Math.max(...scored.map((s) => s.score), 0)
  const pool = maxScore > 0
    ? scored.filter((s) => s.score === maxScore).map((s) => s.look)
    : SHORTS_LOOKS.filter((l) => l.id === 'gold-still')
  const idx = stableHash32(`${songId}:${day}:${vibeKey}`) % pool.length
  return pool[idx] ?? SHORTS_LOOKS[0]
}
