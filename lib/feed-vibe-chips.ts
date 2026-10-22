import { emotionToVibeLabel, normalizeEmotionKey } from './moment/vibe.ts'

/** Feed filter chips: All + every catalog vibe label (matches post emotion keys). */
export const FEED_VIBE_CHIP_KEYS = [
  'CHILL',
  'HOPE',
  'HEALING',
  'GRATEFUL',
  'SPIRITUAL',
  'NOSTALGIA',
  'JOY',
  'LOVE',
  'HYPE',
  'PROUD',
  'HEARTBREAK',
  'PAIN',
  'LONELINESS',
  'LOST',
  'RAGE',
  'SENDIT',
  'LETOUT',
] as const

export type FeedVibeChipKey = (typeof FEED_VIBE_CHIP_KEYS)[number] | 'ALL'

export function feedVibeChipLabel(key: FeedVibeChipKey): string {
  if (key === 'ALL') return 'All'
  const label = emotionToVibeLabel(normalizeEmotionKey(key))
  return label || key
}

/** Map selected feed filter (normalizeEmotion / URL output) to chip key. */
export function feedFilterToChipKey(selectedVibe: string): FeedVibeChipKey {
  if (selectedVibe === 'ALL') return 'ALL'
  const upper = selectedVibe.trim().toUpperCase()
  if (upper === 'SENDIT' || upper === 'LETOUT') return upper
  const key = normalizeEmotionKey(selectedVibe).toUpperCase()
  return key as FeedVibeChipKey
}
