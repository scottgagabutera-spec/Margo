import type { PrimaryTabId } from '@/lib/primary-tab-paint'

/** Tab bar gold: optimistic paint, then tap ack, then committed route. */
export function resolvePrimaryTabBarSelection(input: {
  hubOpen: boolean
  paintedTab: PrimaryTabId | null
  ackedTab: PrimaryTabId | null
  routeTab: PrimaryTabId | null
}): PrimaryTabId | null {
  if (input.hubOpen) return null
  return input.paintedTab ?? input.ackedTab ?? input.routeTab
}

export function primaryTabBarRouteActive(
  selection: PrimaryTabId | null,
  tabId: PrimaryTabId,
  pathname: string,
  ownProfilePath?: string | null,
): boolean {
  if (selection === tabId) return true
  if (selection !== null) return false
  if (tabId === 'feed') return pathname === '/feed'
  if (tabId === 'discover') return pathname.startsWith('/discover')
  if (tabId === 'compose') return pathname === '/compose'
  if (tabId === 'you') {
    if (pathname === '/you') return true
    const own = ownProfilePath?.split('?')[0]
    return !!(own && pathname === own)
  }
  return false
}
