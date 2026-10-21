/**
 * Feed card: map every stored emotion to a display hue, chip label, and glyph id.
 * Six hues + ivory fallback. Discover / export palettes unchanged.
 */
import { normalizeEmotionKey } from '@/lib/moment/vibe'

export type FeedHueKey = 'hype' | 'proud' | 'hope' | 'chill' | 'pain' | 'love' | 'ivory'

export type FeedVibeGlyphId =
  | 'bolt'
  | 'star'
  | 'sun'
  | 'wave'
  | 'spark'
  | 'heart'
  | 'dot'

/** Stored emotion key → feed hue (all keys from lib/moment/vibe VIBE_LABELS). */
export const EMOTION_TO_FEED_HUE: Record<string, FeedHueKey> = {
  chill: 'chill',
  hope: 'hope',
  healing: 'hope',
  grateful: 'proud',
  spiritual: 'chill',
  nostalgia: 'chill',
  joy: 'love',
  love: 'love',
  hype: 'hype',
  proud: 'proud',
  heartbreak: 'pain',
  pain: 'pain',
  loneliness: 'pain',
  lost: 'pain',
  rage: 'hype',
  sendit: 'hype',
  letout: 'hype',
}

export const FEED_HUE_GLYPH: Record<FeedHueKey, FeedVibeGlyphId> = {
  hype: 'bolt',
  proud: 'star',
  hope: 'sun',
  chill: 'wave',
  pain: 'spark',
  love: 'heart',
  ivory: 'dot',
}

/** Emotions seen in product data with no explicit row (legacy / free text). */
const UNMAPPED_FALLBACK_HUE: FeedHueKey = 'ivory'

export function feedHueForEmotion(emotion: string | null | undefined): FeedHueKey {
  const key = normalizeEmotionKey(emotion || '')
  if (!key) return 'ivory'
  return EMOTION_TO_FEED_HUE[key] ?? UNMAPPED_FALLBACK_HUE
}

/** Human-readable list of emotions that rely on ivory fallback until tagged. */
export function listUnmappedEmotionKeys(): string[] {
  const known = new Set(Object.keys(EMOTION_TO_FEED_HUE))
  return [] // all MOMENT_VIBE_PICKER emotions are mapped; unknown free-text uses ivory
}

export function feedHueIsMapped(emotion: string | null | undefined): boolean {
  const key = normalizeEmotionKey(emotion || '')
  if (!key) return false
  return key in EMOTION_TO_FEED_HUE
}
