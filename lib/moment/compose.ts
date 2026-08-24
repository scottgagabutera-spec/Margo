import type { NormalizedMomentLine } from '@/lib/moment/types'

export type MomentArchetype = 'centered' | 'bold' | 'editorial'
export type MomentMotif = 'arc' | 'diagonal' | 'letterform' | 'word' | 'none'
type LengthBucket = 'short' | 'medium' | 'long'
type VibeFamily = 'uplifting' | 'reflective' | 'heavy' | 'release'

/** Serializable composition — the Moment decides what it is; renderers decide how it looks. */
export interface MomentComposition {
  archetype: MomentArchetype
  motif: MomentMotif
}

/** Same grouping used for the Feeling screen's pill order. */
const VIBE_FAMILY: Record<string, VibeFamily> = {
  chill: 'uplifting', hope: 'uplifting', healing: 'uplifting', grateful: 'uplifting',
  joy: 'uplifting', love: 'uplifting', hype: 'uplifting', proud: 'uplifting',
  spiritual: 'reflective', nostalgia: 'reflective',
  heartbreak: 'heavy', pain: 'heavy', loneliness: 'heavy', lost: 'heavy', rage: 'heavy',
  'send it': 'release', 'let out': 'release',
}

const FAMILY_BASE_WEIGHTS: Record<VibeFamily, Record<MomentArchetype, number>> = {
  uplifting:  { centered: 50, bold: 30, editorial: 20 },
  reflective: { centered: 60, bold: 15, editorial: 25 },
  heavy:      { centered: 20, bold: 25, editorial: 55 },
  release:    { centered: 15, bold: 60, editorial: 25 },
}

const LENGTH_MULTIPLIER: Record<LengthBucket, Record<MomentArchetype, number>> = {
  short:  { centered: 1.2, bold: 1.3, editorial: 0.5 },
  medium: { centered: 1,   bold: 1,   editorial: 1 },
  long:   { centered: 0.8, bold: 0.7, editorial: 2.0 },
}

const ARCHETYPE_MOTIF_WEIGHTS: Record<MomentArchetype, Record<MomentMotif, number>> = {
  centered:  { arc: 40, letterform: 30, none: 30, diagonal: 0, word: 0 },
  bold:      { diagonal: 50, letterform: 25, none: 25, arc: 0, word: 0 },
  editorial: { word: 40, arc: 30, none: 30, diagonal: 0, letterform: 0 },
}

function lengthBucketOf(totalChars: number, lineCount: number): LengthBucket {
  const effective = totalChars + (lineCount - 1) * 40
  if (effective < 60) return 'short'
  if (effective < 130) return 'medium'
  return 'long'
}

/** Small deterministic string hash — reproducible, not cryptographic. */
export function hashMomentSeed(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0
  }
  return h
}

function pickWeighted<T extends string>(weights: Record<T, number>, pick0to999: number): T {
  const entries = Object.entries(weights) as [T, number][]
  const total = entries.reduce((sum, [, w]) => sum + w, 0)
  let cursor = (pick0to999 / 1000) * total
  for (const [key, weight] of entries) {
    cursor -= weight
    if (cursor <= 0) return key
  }
  return entries[entries.length - 1][0]
}

export function composeMoment(
  vibeLabel: string | null | undefined,
  lines: NormalizedMomentLine[],
  seedKey: string,
): MomentComposition {
  const family = VIBE_FAMILY[(vibeLabel || '').toLowerCase().trim()] || 'uplifting'
  const totalChars = lines.reduce((sum, l) => sum + l.lyric.trim().length, 0)
  const bucket = lengthBucketOf(totalChars, lines.length)
  const base = FAMILY_BASE_WEIGHTS[family]
  const mult = LENGTH_MULTIPLIER[bucket]
  const weights: Record<MomentArchetype, number> = {
    centered: base.centered * mult.centered,
    bold: base.bold * mult.bold,
    editorial: base.editorial * mult.editorial,
  }
  const archetype = pickWeighted<MomentArchetype>(weights, hashMomentSeed(`${seedKey}:archetype`) % 1000)
  const motif = pickWeighted<MomentMotif>(ARCHETYPE_MOTIF_WEIGHTS[archetype], hashMomentSeed(`${seedKey}:motif`) % 1000)
  return { archetype, motif }
}

/** @deprecated Use MomentComposition — kept for render-moment re-exports */
export type Composition = MomentComposition
