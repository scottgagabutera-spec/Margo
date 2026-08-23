export type HeadlineVariant = 'a' | 'b'

const STORAGE_KEY = 'margo_headline_variant'

export const HEADLINES: Record<HeadlineVariant, string> = {
  a: 'Find the line that says it for you.',
  b: 'Say it with a song.',
}

/** Assign or read the persisted A/B headline variant (client only). */
export function resolveHeadlineVariant(): HeadlineVariant {
  if (typeof window === 'undefined') return 'a'
  const existing = localStorage.getItem(STORAGE_KEY)
  if (existing === 'a' || existing === 'b') return existing
  const variant: HeadlineVariant = Math.random() < 0.5 ? 'a' : 'b'
  localStorage.setItem(STORAGE_KEY, variant)
  return variant
}
