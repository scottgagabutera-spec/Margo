/** Layout tokens and grid presets for Discover view-more pages (no React). */

export const DISCOVER_VM_BATCH = {
  moments: 20,
  songs: 24,
  resonance: 12,
  artists: 24,
} as const

export type DiscoverVmGridKind = 'moments' | 'songs' | 'resonance' | 'artists'

/** Side padding (px) by viewport width. */
export function discoverVmPadX(viewportWidth: number): number {
  if (viewportWidth >= 1440) return 64
  if (viewportWidth >= 1024) return 48
  if (viewportWidth >= 600) return 28
  return 16
}

/** Gap under fixed nav before title row (px). */
export function discoverVmHeaderGap(viewportWidth: number): number {
  if (viewportWidth >= 2560) return 40
  if (viewportWidth >= 1024) return 28
  if (viewportWidth >= 600) return 28
  return 8
}

export const DISCOVER_VM_TITLE = {
  fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
  fontSize: '16px',
  fontWeight: 600,
} as const

export function discoverVmColumnCount(kind: DiscoverVmGridKind, viewportWidth: number): number {
  switch (kind) {
    case 'moments':
      if (viewportWidth >= 2560) return 6
      if (viewportWidth >= 1200) return 5
      if (viewportWidth >= 900) return 4
      if (viewportWidth >= 600) return 3
      return 2
    case 'songs':
      if (viewportWidth >= 2560) return 8
      if (viewportWidth >= 1200) return 7
      if (viewportWidth >= 900) return 6
      if (viewportWidth >= 600) return 5
      return 3
    case 'resonance':
      if (viewportWidth >= 1000) return 3
      if (viewportWidth >= 600) return 2
      return 1
    case 'artists':
      if (viewportWidth >= 1200) return 8
      if (viewportWidth >= 600) return 5
      return 3
    default:
      return 2
  }
}

/** Render-side batch window (does not fetch). */
export function discoverVmVisibleItems<T>(items: T[], visibleCount: number): T[] {
  if (visibleCount <= 0) return []
  return items.slice(0, Math.min(visibleCount, items.length))
}

export function discoverVmHasMore<T>(items: T[], visibleCount: number): boolean {
  return visibleCount < items.length
}
