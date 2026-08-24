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
