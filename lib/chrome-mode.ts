/**
 * App chrome modes (design epic D1):
 * - app — MargoNav + MobileTabBar (+ mini-player when playing)
 * - immersive — karaoke `/song/[id]`: hide shell chrome
 * - marketing — landing `/`: landing nav only, no tab bar / app nav
 */
export type MargoChromeMode = 'app' | 'immersive' | 'marketing'

export function chromeModeForPath(pathname: string | null | undefined): MargoChromeMode {
  if (!pathname || pathname === '/') return 'marketing'
  if (pathname.startsWith('/song/')) return 'immersive'
  return 'app'
}

export function hidesAppShell(pathname: string | null | undefined): boolean {
  const mode = chromeModeForPath(pathname)
  return mode === 'immersive' || mode === 'marketing'
}
