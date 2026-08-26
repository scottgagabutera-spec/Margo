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

/** `/messages/[partnerKey]` — DM thread (not the inbox list). */
export function isMessageThreadPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  const parts = pathname.split('?')[0].split('/').filter(Boolean)
  return parts.length === 2 && parts[0] === 'messages'
}

function isAuthPath(pathname: string | null | undefined): boolean {
  return pathname === '/signin'
}

/** Hide fixed MargoNav (marketing uses landing nav; immersive is chrome-free). */
export function hidesAppNav(pathname: string | null | undefined): boolean {
  const mode = chromeModeForPath(pathname)
  return mode === 'immersive' || mode === 'marketing' || isAuthPath(pathname)
}

/** Hide MobileTabBar on immersive karaoke and sign-in (full-screen auth). */
export function hidesTabBar(pathname: string | null | undefined): boolean {
  return chromeModeForPath(pathname) === 'immersive' || isAuthPath(pathname)
}

/** @deprecated Prefer hidesAppNav / hidesTabBar — kept for call-site migration. */
export function hidesAppShell(pathname: string | null | undefined): boolean {
  return hidesAppNav(pathname) && hidesTabBar(pathname)
}
