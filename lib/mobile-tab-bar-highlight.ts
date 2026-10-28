/**
 * Mobile tab bar: exactly one primary-tab slot (Feed/Discover/Compose/You/Sign in)
 * may read as selected/gold; Hub overlay owns the bar while open.
 */

export function primaryTabBarGold(hubOpen: boolean, routeOrPaintActive: boolean): boolean {
  if (hubOpen) return false
  return routeOrPaintActive
}

export function primaryTabBarLive(hubOpen: boolean, pendingOrAcked: boolean): boolean {
  if (hubOpen) return false
  return pendingOrAcked
}

export function hubTabBarGold(hubOpen: boolean): boolean {
  return hubOpen
}

/** Count of tabs that would render gold — must stay 0 or 1 for primary+hub text tabs. */
export function countMobileTabBarGoldSlots(input: {
  hubOpen: boolean
  feed: boolean
  discover: boolean
  signIn: boolean
  you: boolean
  feedLive?: boolean
  discoverLive?: boolean
  youLive?: boolean
}): number {
  let n = 0
  if (hubTabBarGold(input.hubOpen)) n += 1
  if (primaryTabBarGold(input.hubOpen, input.feed) || primaryTabBarLive(input.hubOpen, !!input.feedLive)) n += 1
  if (primaryTabBarGold(input.hubOpen, input.discover) || primaryTabBarLive(input.hubOpen, !!input.discoverLive)) n += 1
  if (primaryTabBarGold(input.hubOpen, input.signIn)) n += 1
  if (primaryTabBarGold(input.hubOpen, input.you) || primaryTabBarLive(input.hubOpen, !!input.youLive)) n += 1
  return n
}
