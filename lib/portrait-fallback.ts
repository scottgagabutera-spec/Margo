/** Deterministic, gender-neutral portrait tile when the user has no upload. */
export function portraitFallbackFromSeed(seed: string, displayInitial?: string): {
  initial: string
  background: string
  color: string
} {
  const s = (seed || 'margo').trim().toLowerCase()
  let h = 0
  for (let i = 0; i < s.length; i += 1) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) >>> 0
  }
  const hue = 38 + (h % 5) * 18
  const initial = (displayInitial || s.charAt(0) || '?').toUpperCase()
  return {
    initial,
    background: `linear-gradient(148deg, hsl(${hue} 32% 20%) 0%, hsl(${hue} 22% 11%) 52%, hsl(${hue} 18% 8%) 100%)`,
    color: 'var(--gold)',
  }
}
