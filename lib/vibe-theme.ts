/**
 * Feed post-card vibe tokens — single source for fill, text accent, and glow.
 * Base hues from lib/discover-vibes.ts (DISCOVER_VIBE_COLORS) and post-card
 * emotions (heartbreak → pain). Gold matches discoverVibeColor fallback.
 */

import { DISCOVER_VIBE_COLORS } from '@/lib/discover-vibes'

export type VibeTheme = {
  fill: string
  text: string
  glow: string
  faint: string
  border: string
}

const GOLD_FILL = '#E8C547'

/** Post-card / mini-player heartbreak hue (not in DISCOVER_VIBES). */
const PAIN_FILL = '#ff6060'

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

/** Normalize feed emotion / discover vibe to a palette key. */
export function normalizeVibeKey(emotion: string | null | undefined): string {
  const raw = (emotion || '').trim().toLowerCase()
  if (!raw) return 'gold'
  if (raw === 'pain' || raw === 'heartbreak') return 'pain'
  if (raw in DISCOVER_VIBE_COLORS) return raw
  const aliases: Record<string, string> = {
    sendit: 'sendit',
    letout: 'letout',
    rage: 'rage',
    joy: 'joy',
    healing: 'healing',
    nostalgia: 'nostalgia',
    loneliness: 'loneliness',
    grateful: 'grateful',
    spiritual: 'spiritual',
  }
  return aliases[raw] || 'gold'
}

function fillForKey(key: string): string {
  if (key === 'pain') return PAIN_FILL
  if (key === 'gold') return GOLD_FILL
  return DISCOVER_VIBE_COLORS[key] || GOLD_FILL
}

/** WCAG-friendly theme tokens for one vibe (no runtime color extraction). */
export function getVibeTheme(emotion: string | null | undefined): VibeTheme {
  const key = normalizeVibeKey(emotion)
  const fill = fillForKey(key)
  return {
    fill,
    text: mixWhite(fill, key === 'gold' ? 0.38 : 0.42),
    glow: rgba(fill, 0.16),
    faint: rgba(fill, 0.11),
    border: rgba(fill, 0.32),
  }
}

/** Inline CSS variables for a card root (color-mix-free fallbacks). */
export function vibeThemeStyleVars(theme: VibeTheme): Record<string, string> {
  return {
    ['--post-vibe-fill' as string]: theme.fill,
    ['--post-vibe-text' as string]: theme.text,
    ['--post-vibe-glow' as string]: theme.glow,
    ['--post-vibe-faint' as string]: theme.faint,
    ['--post-vibe-border' as string]: theme.border,
  }
}
