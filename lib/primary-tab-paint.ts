/**
 * Pure paint rules for PrimaryTabShell keepalive vs deep (Hub) routes.
 * Used in production and in unit tests (signed-in Hub tile nav flash).
 */

export type PrimaryTabId = 'feed' | 'discover' | 'compose' | 'you'

export function normalizeTabPath(pathname: string | null | undefined): string {
  if (!pathname) return ''
  let path = pathname.split('?')[0]
  try {
    path = decodeURIComponent(path)
  } catch {
    /* keep raw */
  }
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)
  return path
}

export function resolvePrimaryTabId(
  pathname: string | null,
  ownProfileHref: string | null,
): PrimaryTabId | null {
  const path = normalizeTabPath(pathname)
  if (path === '/feed') return 'feed'
  if (path === '/discover') return 'discover'
  if (path === '/compose') return 'compose'
  if (path === '/you') return 'you'
  const own = normalizeTabPath(ownProfileHref)
  if (own && own !== '/you' && path.toLowerCase() === own.toLowerCase()) return 'you'
  return null
}

export type PrimaryTabPaintInput = {
  pathname: string
  ownProfileHref: string | null
  paintedTab: PrimaryTabId | null
  deepNavHref: string | null
  /** When returning to Hub overlay on /feed?hub=1 — hide keepalive until Hub paints. */
  hubRestorePending: boolean
}

export type PrimaryTabPaintState = {
  routeTab: PrimaryTabId | null
  activeTab: PrimaryTabId | null
  onPrimarySurface: boolean
  showKeepalivePanes: boolean
  showDeepNavSkeleton: boolean
  showAppChildren: boolean
  /** Visible surface id for tests: deep skeleton path, primary tab id, or app path. */
  visibleSurface: string
}

export function resolvePrimaryTabPaint(input: PrimaryTabPaintInput): PrimaryTabPaintState {
  const routeTab = resolvePrimaryTabId(input.pathname, input.ownProfileHref)
  const pathOnly = normalizeTabPath(input.pathname)
  const intentPath = input.deepNavHref ? normalizeTabPath(input.deepNavHref) : ''
  const atDeepIntent = !!intentPath && pathOnly.toLowerCase() !== intentPath.toLowerCase()
  const suppressKeepalive =
    atDeepIntent || (input.deepNavHref !== null && routeTab !== null)

  const onPrimarySurface =
    !suppressKeepalive && (routeTab !== null || input.paintedTab !== null)
  const activeTab = suppressKeepalive ? null : input.paintedTab ?? routeTab
  const showKeepalivePanes = onPrimarySurface && activeTab !== null
  const showDeepNavSkeleton = atDeepIntent && !!input.deepNavHref
  const showAppChildren = !showDeepNavSkeleton && activeTab === null

  let visibleSurface = pathOnly || '/'
  if (showDeepNavSkeleton && input.deepNavHref) {
    visibleSurface = intentPath
  } else if (showKeepalivePanes && activeTab) {
    visibleSurface = `primary:${activeTab}`
  }

  return {
    routeTab,
    activeTab,
    onPrimarySurface,
    showKeepalivePanes,
    showDeepNavSkeleton,
    showAppChildren,
    visibleSurface,
  }
}

/** Sequence simulator for Hub tile taps from a primary tab route. */
export function simulateHubTileNavSequence(opts: {
  startPath: string
  tileHref: string
  /** Pathname updates from the router (may lag). */
  pathnameAfterTap: string
  ownProfileHref?: string | null
}): { beforeTap: PrimaryTabPaintState; afterTap: PrimaryTabPaintState } {
  const own = opts.ownProfileHref ?? null
  const beforeTap = resolvePrimaryTabPaint({
    pathname: opts.startPath,
    ownProfileHref: own,
    paintedTab: null,
    deepNavHref: null,
    hubRestorePending: false,
  })
  const afterTap = resolvePrimaryTabPaint({
    pathname: opts.pathnameAfterTap,
    ownProfileHref: own,
    paintedTab: null,
    deepNavHref: opts.tileHref,
    hubRestorePending: false,
  })
  return { beforeTap, afterTap }
}

export function feedPrimarySurfaceVisible(state: PrimaryTabPaintState): boolean {
  return state.visibleSurface === 'primary:feed'
}
