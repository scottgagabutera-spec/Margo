import type { AtmosphereId } from '@/lib/atmosphere'
import type { MomentThemeId } from '@/lib/moment/types'

/** Full Compose / emotion vocabulary — not the narrower upload-tag set. */
export const PROMOTE_MOODS = [
  'HEARTBREAK', 'PAIN', 'LONELINESS', 'LOST', 'RAGE', 'SENDIT', 'LETOUT',
  'HYPE', 'NOSTALGIA', 'SPIRITUAL', 'CHILL', 'HEALING', 'HOPE', 'GRATEFUL',
  'JOY', 'LOVE', 'PROUD',
] as const

export type PromoteMood = (typeof PROMOTE_MOODS)[number]

export interface MoodEffectMapping {
  atmosphereId: AtmosphereId
  themeId: MomentThemeId
}

const MOOD_EFFECT_MAP: Record<PromoteMood, MoodEffectMapping> = {
  HEARTBREAK: { atmosphereId: 'weight', themeId: 'dusk' },
  PAIN: { atmosphereId: 'breath', themeId: 'dusk' },
  LONELINESS: { atmosphereId: 'breath', themeId: 'dusk' },
  LOST: { atmosphereId: 'drift', themeId: 'dusk' },
  RAGE: { atmosphereId: 'pulse', themeId: 'gold' },
  SENDIT: { atmosphereId: 'pulse', themeId: 'gold' },
  LETOUT: { atmosphereId: 'pulse', themeId: 'gold' },
  HYPE: { atmosphereId: 'pulse', themeId: 'gold' },
  NOSTALGIA: { atmosphereId: 'drift', themeId: 'gold' },
  SPIRITUAL: { atmosphereId: 'breath', themeId: 'dusk' },
  CHILL: { atmosphereId: 'still', themeId: 'sage' },
  HEALING: { atmosphereId: 'still', themeId: 'sage' },
  HOPE: { atmosphereId: 'still', themeId: 'gold' },
  GRATEFUL: { atmosphereId: 'still', themeId: 'gold' },
  JOY: { atmosphereId: 'still', themeId: 'gold' },
  LOVE: { atmosphereId: 'still', themeId: 'blush' },
  PROUD: { atmosphereId: 'still', themeId: 'gold' },
}

const DEFAULT_MAPPING: MoodEffectMapping = {
  atmosphereId: 'still',
  themeId: 'gold',
}

/** Compact string for LLM system prompts. */
export const MOOD_EFFECT_PROMPT_RULES = [
  'HEARTBREAK→weight+dusk | PAIN→breath+dusk | LONELINESS→breath+dusk | LOST→drift+dusk',
  'RAGE→pulse+gold | SENDIT→pulse+gold | LETOUT→pulse+gold | HYPE→pulse+gold',
  'NOSTALGIA→drift+gold | SPIRITUAL→breath+dusk',
  'CHILL→still+sage | HEALING→still+sage | HOPE→still+gold | GRATEFUL→still+gold',
  'JOY→still+gold | LOVE→still+blush | PROUD→still+gold',
  'Unknown/filler → still+gold',
].join('\n')

export function normalizePromoteMood(raw: string | null | undefined): PromoteMood | null {
  if (!raw?.trim()) return null
  const key = raw.trim().toUpperCase().replace(/\s+/g, '')
  return (PROMOTE_MOODS as readonly string[]).includes(key) ? (key as PromoteMood) : null
}

export function resolveMoodEffect(
  rawMood: string | null | undefined,
): MoodEffectMapping & { mood: PromoteMood | null; unmappedMood: boolean } {
  const mood = normalizePromoteMood(rawMood)
  if (!mood) {
    return { ...DEFAULT_MAPPING, mood: null, unmappedMood: true }
  }
  return { ...MOOD_EFFECT_MAP[mood], mood, unmappedMood: false }
}
