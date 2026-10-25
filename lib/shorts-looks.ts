import { stableHash32, utcDayKey } from './shorts-shelf-rotation.ts'

export type ShortsLookTier = 'free' | 'paid'
export type ShortsStageThemeId = 'gold' | 'blush' | 'sage' | 'dusk'
export type ShortsAtmosphereId = 'still' | 'breath' | 'drift' | 'pulse' | 'weight'

/** Scott-tunable mix: must sum to 100 (percent buckets). */
export const SHORTS_LOOK_MODE_SHARES = {
  colourOnly: 34,
  effectOnly: 33,
  colourAndEffect: 33,
} as const

export type ShortsLookMode = 'colour-only' | 'effect-only' | 'colour-and-effect'

export type ShortsLook = {
  id: string
  label: string
  stageThemeId: ShortsStageThemeId
  atmosphereId: ShortsAtmosphereId
  tier: ShortsLookTier
  mode: ShortsLookMode
  /** Relative weight per stored vibe key (uppercase, e.g. HOPE). */
  vibeWeights: Partial<Record<string, number>>
}

const STAGE_THEMES: ShortsStageThemeId[] = ['gold', 'blush', 'sage', 'dusk']
const LIVING_EFFECTS: Exclude<ShortsAtmosphereId, 'still'>[] = ['breath', 'drift', 'pulse', 'weight']

const THEME_VIBE_WEIGHTS: Record<ShortsStageThemeId, Partial<Record<string, number>>> = {
  gold: { CHILL: 2, GRATEFUL: 2, HOPE: 2, NOSTALGIA: 1, PROUD: 1 },
  blush: { LOVE: 3, JOY: 2, NOSTALGIA: 2 },
  sage: { CHILL: 3, HOPE: 2, GRATEFUL: 2, HEALING: 1 },
  dusk: { HEARTBREAK: 3, PAIN: 2, LONELINESS: 2, LOST: 2, HYPE: 1, RAGE: 1 },
}

const EFFECT_VIBE_WEIGHTS: Record<Exclude<ShortsAtmosphereId, 'still'>, Partial<Record<string, number>>> = {
  breath: { HOPE: 3, HEALING: 2, SPIRITUAL: 2, CHILL: 1 },
  drift: { LOVE: 3, JOY: 2, NOSTALGIA: 2, PROUD: 1 },
  pulse: { HYPE: 3, RAGE: 2, SENDIT: 2, LETOUT: 2 },
  weight: { HEARTBREAK: 3, PAIN: 2, LONELINESS: 2, LOST: 2 },
}

/** In-code registry — DB tier/paid flags can mirror this later. */
export const SHORTS_LOOKS: ShortsLook[] = [
  {
    id: 'gold-still',
    label: 'Gold',
    stageThemeId: 'gold',
    atmosphereId: 'still',
    tier: 'free',
    mode: 'colour-only',
    vibeWeights: { CHILL: 2, GRATEFUL: 2, NOSTALGIA: 1 },
  },
  {
    id: 'gold-breath',
    label: 'Gold · Slow Rise',
    stageThemeId: 'gold',
    atmosphereId: 'breath',
    tier: 'free',
    mode: 'colour-and-effect',
    vibeWeights: { HOPE: 3, HEALING: 2, SPIRITUAL: 2, CHILL: 1 },
  },
  {
    id: 'blush-drift',
    label: 'Blush · Wave',
    stageThemeId: 'blush',
    atmosphereId: 'drift',
    tier: 'free',
    mode: 'colour-and-effect',
    vibeWeights: { LOVE: 3, JOY: 2, NOSTALGIA: 2 },
  },
  {
    id: 'sage-breath',
    label: 'Sage · Slow Rise',
    stageThemeId: 'sage',
    atmosphereId: 'breath',
    tier: 'free',
    mode: 'colour-and-effect',
    vibeWeights: { CHILL: 3, HOPE: 2, GRATEFUL: 2 },
  },
  {
    id: 'dusk-weight',
    label: 'Dusk · Falling',
    stageThemeId: 'dusk',
    atmosphereId: 'weight',
    tier: 'free',
    mode: 'colour-and-effect',
    vibeWeights: { HEARTBREAK: 3, PAIN: 2, LONELINESS: 2, LOST: 2 },
  },
  {
    id: 'dusk-pulse',
    label: 'Dusk · Beat',
    stageThemeId: 'dusk',
    atmosphereId: 'pulse',
    tier: 'free',
    mode: 'colour-and-effect',
    vibeWeights: { HYPE: 3, RAGE: 2, SENDIT: 2, LETOUT: 2, PROUD: 1 },
  },
  {
    id: 'gold-drift-paid',
    label: 'Gold · Wave (Studio)',
    stageThemeId: 'gold',
    atmosphereId: 'drift',
    tier: 'paid',
    mode: 'colour-and-effect',
    vibeWeights: { PROUD: 2, HYPE: 1, JOY: 1 },
  },
]

/** Shelf only — paid / Studio looks stay in registry for future use. */
export const SHORTS_FREE_LOOKS = SHORTS_LOOKS.filter((l) => l.tier === 'free')

function normalizeVibeKey(vibe: string | null | undefined): string {
  return (vibe || '').trim().toUpperCase() || 'IVORY'
}

function scoreMapForVibe(
  weights: Partial<Record<string, number>>,
  vibeKey: string,
): number {
  return weights[vibeKey] ?? weights.IVORY ?? 0
}

function pickFromWeightedMap<T extends string>(
  items: T[],
  weights: Record<T, Partial<Record<string, number>>>,
  vibeKey: string,
  salt: string,
): T {
  const scored = items.map((item) => ({
    item,
    score: scoreMapForVibe(weights[item], vibeKey),
  }))
  const maxScore = Math.max(...scored.map((s) => s.score), 0)
  const pool = maxScore > 0
    ? scored.filter((s) => s.score === maxScore).map((s) => s.item)
    : items
  const idx = stableHash32(salt) % pool.length
  return pool[idx] ?? items[0]
}

function pickLookMode(songId: string): ShortsLookMode {
  const shares = SHORTS_LOOK_MODE_SHARES
  const total = shares.colourOnly + shares.effectOnly + shares.colourAndEffect
  const bucket = stableHash32(`${songId}:mode`) % total
  if (bucket < shares.colourOnly) return 'colour-only'
  if (bucket < shares.colourOnly + shares.effectOnly) return 'effect-only'
  return 'colour-and-effect'
}

function scoreLookForVibe(look: ShortsLook, vibeKey: string): number {
  return look.vibeWeights[vibeKey] ?? look.vibeWeights.IVORY ?? 0
}

function pickCombinedLook(songId: string, vibeKey: string, day: string): ShortsLook {
  const scored = SHORTS_FREE_LOOKS.filter((l) => l.mode === 'colour-and-effect').map((look) => ({
    look,
    score: scoreLookForVibe(look, vibeKey),
  }))
  const maxScore = Math.max(...scored.map((s) => s.score), 0)
  const pool = maxScore > 0
    ? scored.filter((s) => s.score === maxScore).map((s) => s.look)
    : SHORTS_FREE_LOOKS.filter((l) => l.id === 'gold-breath')
  const idx = stableHash32(`${songId}:${day}:${vibeKey}:combo`) % pool.length
  return pool[idx] ?? SHORTS_FREE_LOOKS[0]
}

/** Deterministic look for a catalog clip. */
export function pickShortsLook(
  songId: string,
  vibe: string | null | undefined,
  day: string = utcDayKey(new Date()),
): ShortsLook {
  const vibeKey = normalizeVibeKey(vibe)
  const mode = pickLookMode(songId)

  if (mode === 'colour-and-effect') {
    return pickCombinedLook(songId, vibeKey, day)
  }

  if (mode === 'colour-only') {
    const stageThemeId = pickFromWeightedMap(
      STAGE_THEMES,
      THEME_VIBE_WEIGHTS,
      vibeKey,
      `${songId}:${day}:${vibeKey}:theme`,
    )
    return {
      id: `${stageThemeId}-still`,
      label: `${stageThemeId} · Color`,
      stageThemeId,
      atmosphereId: 'still',
      tier: 'free',
      mode: 'colour-only',
      vibeWeights: THEME_VIBE_WEIGHTS[stageThemeId],
    }
  }

  const atmosphereId = pickFromWeightedMap(
    LIVING_EFFECTS,
    EFFECT_VIBE_WEIGHTS,
    vibeKey,
    `${songId}:${day}:${vibeKey}:fx`,
  )
  const neutralTheme: ShortsStageThemeId =
    stableHash32(`${songId}:fx-theme`) % 2 === 0 ? 'gold' : 'dusk'
  return {
    id: `${neutralTheme}-${atmosphereId}-fx`,
    label: `${neutralTheme} · ${atmosphereId}`,
    stageThemeId: neutralTheme,
    atmosphereId,
    tier: 'free',
    mode: 'effect-only',
    vibeWeights: EFFECT_VIBE_WEIGHTS[atmosphereId],
  }
}

/** Human-readable mode + theme + atmosphere (for reports and tests). */
export function describeShortsLook(look: ShortsLook): string {
  if (look.mode === 'colour-only') return `colour (${look.stageThemeId})`
  if (look.mode === 'effect-only') return `effect (${look.atmosphereId})`
  return `both (${look.stageThemeId}+${look.atmosphereId})`
}
