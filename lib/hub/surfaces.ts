/**
 * @deprecated Prefer `lib/hub/tiles` — kept for tests and unread helpers.
 */
import {
  hubHasActivity as tilesHaveActivity,
  hubTileBadgeLabel,
  resolveHubTiles,
  type HubTileId,
} from '@/lib/hub/tiles'

export type HubSurfaceId = 'library' | 'messages' | 'notifications' | 'stage'

export type HubSurface = {
  id: HubSurfaceId
  label: string
  href: string
  public?: boolean
  unread: number
}

export function buildHubSurfaces(
  unreadById: Partial<Record<HubSurfaceId, number>> = {},
): HubSurface[] {
  const tiles = resolveHubTiles({
    signedIn: true,
    isArtist: false,
    unread: {
      messages: unreadById.messages ?? 0,
      notifications: unreadById.notifications ?? 0,
    },
  })
  return tiles.map((t) => ({
    id: t.id as HubSurfaceId,
    label: t.label,
    href: t.href,
    public: !t.needsAccount,
    unread: t.count,
  }))
}

export function hubHasActivity(surfaces: HubSurface[]): boolean {
  return surfaces.some((s) => s.unread > 0)
}

export { hubTileBadgeLabel, type HubTileId }
