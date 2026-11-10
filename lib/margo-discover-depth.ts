/** Remember the last Discover inner catalog route for the Discover primary tab. */

const DISCOVER_DEPTH_KEY = 'margo-discover-depth'

const INNER_PATHS = new Set([
  '/discover/songs',
  '/discover/moments',
  '/discover/resonance',
  '/artists',
])

export function isDiscoverInnerPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  const p = pathname.split('?')[0]
  return INNER_PATHS.has(p)
}

export function persistDiscoverDepth(pathname: string) {
  const p = pathname.split('?')[0]
  if (!INNER_PATHS.has(p)) return
  try {
    sessionStorage.setItem(DISCOVER_DEPTH_KEY, p)
  } catch {
    /* */
  }
}

export function clearDiscoverDepth() {
  try {
    sessionStorage.removeItem(DISCOVER_DEPTH_KEY)
  } catch {
    /* */
  }
}

export function readDiscoverDepth(): string | null {
  try {
    const raw = sessionStorage.getItem(DISCOVER_DEPTH_KEY)
    if (!raw || !INNER_PATHS.has(raw)) return null
    return raw
  } catch {
    return null
  }
}

/** Primary-tab Discover tap lands on the last inner page when set. */
export function resolveDiscoverPrimaryHref(fallback = '/discover'): string {
  return readDiscoverDepth() ?? fallback
}
