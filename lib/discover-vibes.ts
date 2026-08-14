/** Shared Discover vibe vocabulary (Moments / Mixtapes / catalog filters). */

export const DISCOVER_VIBES = [
  'ALL', 'CHILL', 'HOPE', 'HEALING', 'GRATEFUL', 'SPIRITUAL',
  'NOSTALGIA', 'JOY', 'LOVE', 'HYPE', 'PROUD',
] as const

export type DiscoverVibe = (typeof DISCOVER_VIBES)[number]

export const DISCOVER_VIBE_COLORS: Record<string, string> = {
  chill: '#60b8ff', hope: '#7B9FFF', healing: '#4ade80', grateful: '#a0e080',
  spiritual: '#c8a0ff', nostalgia: '#E8C547', joy: '#ffc847', love: '#FF6B9D',
  hype: '#FF4D4D', proud: '#FFB347',
}

export function discoverVibeColor(vibe: string | null | undefined): string {
  if (!vibe) return 'var(--gold)'
  return DISCOVER_VIBE_COLORS[vibe.toLowerCase()] || 'var(--gold)'
}
