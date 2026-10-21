/**
 * Feed post-card vibe tokens only — Discover / mini-player / EMOTION_COLORS unchanged.
 * Gold (#E8C547) is reserved for Margo brand + tier-1 card chrome, not unknown vibes.
 */

export type VibeTheme = {
  fill: string
  text: string
  glow: string
  faint: string
  border: string
}

export type FeedVibeLayoutGlow = 'hero' | 'compact'

const IVORY_FILL = '#E8E4DC'

/** Feed card palette (PR #252 quality pass). */
export const FEED_VIBE_FILL: Record<string, string> = {
  hype: '#FF5A36',
  proud: '#F5B83A',
  hope: '#3DDC97',
  chill: '#35C6E8',
  pain: '#9B7BFF',
  love: '#FF5C9E',
  ivory: IVORY_FILL,
}

const FEED_VIBE_KEYS = new Set(['hype', 'pain', 'proud', 'love', 'chill', 'hope'])

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

function mixWhite(hex: string, whiteMix: number): string {
  const [r, g, b] = hexToRgb(hex)
  const f = (c: number) => Math.round(c + (255 - c) * whiteMix)
  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${toHex(f(r))}${toHex(f(g))}${toHex(f(b))}`
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Normalize feed emotion to one of six vibes or ivory (unknown). */
export function normalizeVibeKey(emotion: string | null | undefined): string {
  const raw = (emotion || '').trim().toLowerCase()
  if (!raw) return 'ivory'
  if (raw === 'pain' || raw === 'heartbreak') return 'pain'
  if (FEED_VIBE_KEYS.has(raw)) return raw
  return 'ivory'
}

function fillForKey(key: string): string {
  return FEED_VIBE_FILL[key] ?? IVORY_FILL
}

/** WCAG-friendly theme tokens for feed cards. */
export function getVibeTheme(
  emotion: string | null | undefined,
  options?: { layout?: FeedVibeLayoutGlow },
): VibeTheme {
  const key = normalizeVibeKey(emotion)
  const fill = fillForKey(key)
  const glowAlpha = options?.layout === 'hero' ? 0.22 : 0.12
  const textMix = key === 'ivory' ? 0.25 : 0.42
  return {
    fill,
    text: mixWhite(fill, textMix),
    glow: rgba(fill, glowAlpha),
    faint: rgba(fill, 0.11),
    border: rgba(fill, key === 'ivory' ? 0.22 : 0.32),
  }
}

/** Tier-1 / brand gold tokens (border only on card shell — not unknown vibe). */
export const TIER1_GOLD_THEME: VibeTheme = {
  fill: '#E8C547',
  text: mixWhite('#E8C547', 0.38),
  glow: rgba('#E8C547', 0.12),
  faint: rgba('#E8C547', 0.1),
  border: rgba('#E8C547', 0.32),
}

export function vibeThemeStyleVars(theme: VibeTheme): Record<string, string> {
  return {
    ['--post-vibe-fill' as string]: theme.fill,
    ['--post-vibe-text' as string]: theme.text,
    ['--post-vibe-glow' as string]: theme.glow,
    ['--post-vibe-faint' as string]: theme.faint,
    ['--post-vibe-border' as string]: theme.border,
  }
}
