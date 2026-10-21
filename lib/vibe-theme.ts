/**
 * Feed post-card vibe tokens only — Discover / mini-player / EMOTION_COLORS unchanged.
 * Gold (#E8C547) is reserved for Margo brand + tier-1 card chrome, not unknown vibes.
 */

import { feedHueForEmotion, type FeedHueKey } from '@/lib/feed-vibe-map'

export type VibeTheme = {
  hue: FeedHueKey
  fill: string
  /** Accent text (progress, full-song label, moment strong). */
  text: string
  /** Chip label — meets 4.5:1 on chip fill. */
  chipText: string
  faint: string
  border: string
}

const IVORY_FILL = '#E8E4DC'

/** Feed card palette (PR #252). */
export const FEED_VIBE_FILL: Record<FeedHueKey, string> = {
  hype: '#FF5A36',
  proud: '#F5B83A',
  hope: '#3DDC97',
  chill: '#35C6E8',
  pain: '#9B7BFF',
  love: '#FF5C9E',
  ivory: IVORY_FILL,
}

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

/** @deprecated use feedHueForEmotion — kept for filter comparisons */
export function normalizeVibeKey(emotion: string | null | undefined): string {
  return feedHueForEmotion(emotion)
}

function fillForKey(key: FeedHueKey): string {
  return FEED_VIBE_FILL[key] ?? IVORY_FILL
}

/** WCAG-friendly theme tokens for feed cards (no card glow). */
export function getVibeTheme(emotion: string | null | undefined): VibeTheme {
  const hue = feedHueForEmotion(emotion)
  const fill = fillForKey(hue)
  const textMix = hue === 'ivory' ? 0.2 : 0.38
  const chipText = hue === 'ivory' ? '#C8C4BC' : mixWhite(fill, 0.12)
  return {
    hue,
    fill,
    text: mixWhite(fill, textMix),
    chipText,
    faint: rgba(fill, hue === 'ivory' ? 0.08 : 0.14),
    border: rgba(fill, hue === 'ivory' ? 0.22 : 0.38),
  }
}

/** Tier-1 / brand gold tokens (border only on card shell — not unknown vibe). */
export const TIER1_GOLD_THEME: Pick<VibeTheme, 'fill' | 'text' | 'faint' | 'border'> = {
  fill: '#E8C547',
  text: mixWhite('#E8C547', 0.38),
  faint: rgba('#E8C547', 0.1),
  border: rgba('#E8C547', 0.32),
}

export function vibeThemeStyleVars(theme: VibeTheme): Record<string, string> {
  return {
    ['--post-vibe-fill' as string]: theme.fill,
    ['--post-vibe-text' as string]: theme.text,
    ['--post-vibe-chip-text' as string]: theme.chipText,
    ['--post-vibe-faint' as string]: theme.faint,
    ['--post-vibe-border' as string]: theme.border,
  }
}
