/**
 * Emotion enum → human-readable vibe label.
 * Shared by Feed export, post cards, and MargoMoment resolution.
 */

const VIBE_LABELS: Record<string, string> = {
  chill: 'Chill',
  hope: 'Hope',
  healing: 'Healing',
  grateful: 'Grateful',
  spiritual: 'Spiritual',
  nostalgia: 'Nostalgia',
  joy: 'Joy',
  love: 'Love',
  hype: 'Hype',
  proud: 'Proud',
  heartbreak: 'Heartbreak',
  pain: 'Pain',
  loneliness: 'Loneliness',
  lost: 'Lost',
  rage: 'Rage',
  sendit: 'Send It',
  letout: 'Let Out',
}

/** Normalize stored emotion strings to a lookup key (lowercase, no spaces). */
export function normalizeEmotionKey(emotion: string): string {
  if (!emotion) return ''
  return emotion
    .replace(/send.?it/i, 'SENDIT')
    .replace(/let.?out/i, 'LETOUT')
    .replace('SendIt', 'SENDIT')
    .replace('LetOut', 'LETOUT')
    .replace('SEND IT', 'SENDIT')
    .replace('LET OUT', 'LETOUT')
    .toLowerCase()
}

export function emotionToVibeLabel(emotion: string | null | undefined): string | null {
  if (!emotion?.trim()) return null
  const key = normalizeEmotionKey(emotion)
  return VIBE_LABELS[key] || emotion.trim()
}

/** Human vibe label (e.g. "Grateful") → stored emotion key (e.g. GRATEFUL). */
export function vibeLabelToEmotion(label: string | null | undefined): string | null {
  if (!label?.trim()) return null
  const normalized = label.trim().toLowerCase()
  for (const [key, human] of Object.entries(VIBE_LABELS)) {
    if (human.toLowerCase() === normalized) return key.toUpperCase()
  }
  return label.trim().toUpperCase().replace(/\s+/g, '')
}

/** Ordered vibe labels for Stage-style pickers (export modal, landing). */
export const MOMENT_VIBE_PICKER_OPTIONS: string[] = [
  'Chill', 'Hope', 'Healing', 'Grateful', 'Spiritual', 'Nostalgia',
  'Joy', 'Love', 'Hype', 'Proud', 'Heartbreak', 'Pain', 'Loneliness',
  'Lost', 'Rage', 'Send It', 'Let Out',
]

/** Canonical vibe keys (17) — must match VIBE_LABELS. */
export const MARGO_VIBE_KEYS = Object.keys(VIBE_LABELS) as (keyof typeof VIBE_LABELS)[]

export function isMargoVibeKey(raw: string | null | undefined): boolean {
  if (!raw?.trim()) return false
  const key = normalizeEmotionKey(raw.trim())
  return key in VIBE_LABELS
}

/** Stored posts.emotion value for a canonical vibe key. */
export function vibeKeyToStoredEmotion(raw: string): string {
  const key = normalizeEmotionKey(raw)
  if (key === 'sendit') return 'SENDIT'
  if (key === 'letout') return 'LETOUT'
  return key.toUpperCase()
}

export type ResolveLyricBackEmotionResult =
  | { ok: true; emotion: string }
  | { ok: false; reason: 'invalid_vibe' | 'missing_vibe' }

/**
 * Lyric Back create: accept only MARGO_VIBE_KEYS; default to parent vibe when omitted.
 */
export function resolveLyricBackStoredEmotion(
  requested: string | null | undefined,
  parentEmotion: string | null | undefined,
): ResolveLyricBackEmotionResult {
  const parentOk = isMargoVibeKey(parentEmotion)
  const defaultKey = parentOk ? normalizeEmotionKey(parentEmotion!.trim()) : 'chill'

  const req = typeof requested === 'string' ? requested.trim() : ''
  if (!req) {
    return { ok: true, emotion: vibeKeyToStoredEmotion(defaultKey) }
  }
  if (!isMargoVibeKey(req)) {
    return { ok: false, reason: 'invalid_vibe' }
  }
  return { ok: true, emotion: vibeKeyToStoredEmotion(req) }
}
