/**
 * Hub launcher tiles — single config list. New surfaces (Playlists, Studio, …)
 * are one entry here; no layout redesign.
 */
export type HubTileId =
  | 'stage'
  | 'messages'
  | 'notifications'
  | 'library'
  | 'studio'
  | 'promote'

export type HubTileAudience = 'everyone' | 'artists'

export type HubTileCountSource = 'messages' | 'notifications' | null

export type HubTileIconId = 'stage' | 'messages' | 'notifications' | 'library'

export type HubTileConfig = {
  id: HubTileId
  label: string
  captionSignedOut: string
  captionSignedIn: string
  /** Stage caption uses gold when true (signed out + signed in). */
  captionGold?: boolean
  route: string
  order: number
  needsAccount: boolean
  audience: HubTileAudience
  /** When false, tile is omitted until product enables it. */
  ship: boolean
  countSource: HubTileCountSource
  icon: HubTileIconId
}

export const HUB_TILE_CONFIG: HubTileConfig[] = [
  {
    id: 'stage',
    label: 'The Stage',
    captionSignedOut: 'Open to all',
    captionSignedIn: 'Open to all',
    captionGold: true,
    route: '/',
    order: 1,
    needsAccount: false,
    audience: 'everyone',
    ship: true,
    countSource: null,
    icon: 'stage',
  },
  {
    id: 'messages',
    label: 'Messages',
    captionSignedOut: 'Your chats',
    captionSignedIn: 'Your chats',
    route: '/messages',
    order: 2,
    needsAccount: true,
    audience: 'everyone',
    ship: true,
    countSource: 'messages',
    icon: 'messages',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    captionSignedOut: 'Your updates',
    captionSignedIn: 'Your updates',
    route: '/notifications',
    order: 3,
    needsAccount: true,
    audience: 'everyone',
    ship: true,
    countSource: 'notifications',
    icon: 'notifications',
  },
  {
    id: 'library',
    label: 'Library',
    captionSignedOut: 'Your songs',
    captionSignedIn: 'Your songs',
    route: '/library',
    order: 4,
    needsAccount: true,
    audience: 'everyone',
    ship: true,
    countSource: null,
    icon: 'library',
  },
  {
    id: 'studio',
    label: 'Studio',
    captionSignedOut: 'Upload',
    captionSignedIn: 'Upload',
    route: '/studio',
    order: 5,
    needsAccount: true,
    audience: 'artists',
    ship: false,
    countSource: null,
    icon: 'library',
  },
  {
    id: 'promote',
    label: 'Promote',
    captionSignedOut: 'Reach',
    captionSignedIn: 'Reach',
    route: '/studio',
    order: 6,
    needsAccount: true,
    audience: 'artists',
    ship: false,
    countSource: null,
    icon: 'library',
  },
]

export type ResolvedHubTile = HubTileConfig & {
  href: string
  locked: boolean
  dimmed: boolean
  count: number
  caption: string
}

export function hubTileBadgeLabel(count: number): string {
  if (count <= 0) return ''
  if (count > 9) return '9+'
  return String(count)
}

export function resolveHubTiles(input: {
  signedIn: boolean
  isArtist: boolean
  unread: Partial<Record<'messages' | 'notifications', number>>
}): ResolvedHubTile[] {
  const { signedIn, isArtist, unread } = input
  return HUB_TILE_CONFIG.filter((tile) => {
    if (!tile.ship) return false
    if (tile.audience === 'artists' && !isArtist) return false
    return true
  })
    .sort((a, b) => a.order - b.order)
    .map((tile) => {
      const count =
        tile.countSource && signedIn ? unread[tile.countSource] ?? 0 : 0
      const needsSignIn = tile.needsAccount && !signedIn
      const caption = signedIn ? tile.captionSignedIn : tile.captionSignedOut
      return {
        ...tile,
        href: tile.route,
        locked: needsSignIn,
        dimmed: needsSignIn,
        count,
        caption,
      }
    })
}

/** Signed-out tiles that show a lock (account required). */
export function hubSignedOutLockedTileIds(tiles: ResolvedHubTile[]): HubTileId[] {
  return tiles.filter((t) => t.locked).map((t) => t.id)
}

export function hubTileOrderIds(tiles: ResolvedHubTile[]): HubTileId[] {
  return tiles.map((t) => t.id)
}

export function hubHasActivity(tiles: ResolvedHubTile[]): boolean {
  return tiles.some((t) => t.count > 0)
}
