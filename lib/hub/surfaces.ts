/**
 * Hub surfaces — one entry per tile.
 * Chrome (tab/icon) shows a presence dot when any surface has unread > 0.
 * Tile badges stay per-surface. Library / Stage have no unread concept: leave 0.
 *
 * The Stage (`/`) is the marketing / try-first door. App logo stays Feed
 * (in-app home). Hub is how you return to landing after leaving it.
 */
export type HubSurfaceId = 'library' | 'messages' | 'notifications' | 'stage'

export type HubSurface = {
  id: HubSurfaceId
  label: string
  href: string
  wide?: boolean
  /** Reachable without sign-in (Stage landing). */
  public?: boolean
  unread: number
}

const HUB_SURFACE_DEFS: Omit<HubSurface, 'unread'>[] = [
  { id: 'library', label: 'Music Library', href: '/library', wide: true },
  { id: 'stage', label: 'The Stage', href: '/', public: true },
  { id: 'messages', label: 'Messages', href: '/messages' },
  { id: 'notifications', label: 'Notifications', href: '/notifications' },
]

export function buildHubSurfaces(
  unreadById: Partial<Record<HubSurfaceId, number>> = {},
): HubSurface[] {
  return HUB_SURFACE_DEFS.map((def) => ({
    ...def,
    unread: unreadById[def.id] ?? 0,
  }))
}

export function hubHasActivity(surfaces: HubSurface[]): boolean {
  return surfaces.some((s) => s.unread > 0)
}
