/** Hub tile destinations — prefetch when Hub opens (no schema / route changes). */
export const HUB_TILE_PREFETCH_HREFS = ['/messages', '/notifications', '/library'] as const

export type HubTilePrefetchHref = (typeof HUB_TILE_PREFETCH_HREFS)[number]

export function isHubTilePrefetchHref(href: string): href is HubTilePrefetchHref {
  const path = href.split('?')[0]
  return (HUB_TILE_PREFETCH_HREFS as readonly string[]).includes(path)
}

export const MARGO_HUB_DEEP_NAV_EVENT = 'margo:hub-deep-nav'

export type HubDeepNavDetail = { href: string }

export function dispatchHubDeepNav(href: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<HubDeepNavDetail>(MARGO_HUB_DEEP_NAV_EVENT, { detail: { href } }),
  )
}
