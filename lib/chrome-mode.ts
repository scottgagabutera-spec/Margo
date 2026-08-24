/**
 * App chrome modes (design epic D1 + landing tab restore):
 * - app — MargoNav + MobileTabBar (+ mini-player when playing)
 * - immersive — karaoke `/song/[id]`: hide shell chrome (nav + tab bar)
 * - marketing — landing `/`: Stage front door (landing nav; tab bar shown at rest)
 */
export type MargoChromeMode = 'app' | 'immersive' | 'marketing'

export function chromeModeForPath(pathname: string | null | undefined): MargoChromeMode {
  if (!pathname || pathname === '/') return 'marketing'
  if (pathname.startsWith('/song/')) return 'immersive'
  if (pathname.startsWith('/m/')) return 'immersive'
  return 'app'
}

/** Hide fixed MargoNav (marketing uses landing nav; immersive is chrome-free). */
export function hidesAppNav(pathname: string | null | undefined): boolean {
  const mode = chromeModeForPath(pathname)
  return mode === 'immersive' || mode === 'marketing'
}

/** Hide MobileTabBar on immersive karaoke only. Stage landing shows tab bar at rest. */
export function hidesTabBar(pathname: string | null | undefined): boolean {
  return chromeModeForPath(pathname) === 'immersive'
}

/** @deprecated Prefer hidesAppNav / hidesTabBar — kept for call-site migration. */
export function hidesAppShell(pathname: string | null | undefined): boolean {
  return hidesAppNav(pathname) && hidesTabBar(pathname)
}
