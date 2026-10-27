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
  if (!pathname) return false
  return (
    pathname === '/signin'
    || pathname === '/forgot-password'
    || pathname === '/reset-password'
    || pathname.startsWith('/auth/callback')
    || pathname === '/welcome'
    || pathname.startsWith('/welcome/')
  )
}

/** `/admin` is an internal tool — never show public Margo nav or You/Feed tabs. */
function isAdminPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  const path = pathname.split('?')[0]
  return path === '/admin' || path.startsWith('/admin/')
}

/** Hide fixed MargoNav (marketing uses landing nav; immersive is chrome-free). */
export function hidesAppNav(pathname: string | null | undefined): boolean {
  const mode = chromeModeForPath(pathname)
  return mode === 'immersive' || mode === 'marketing' || isAuthPath(pathname) || isAdminPath(pathname)
}

export type HidesTabBarOptions = {
  /** Phone primary chrome: keep tab bar visible on /signin (keyboard still hides via data-margo-keyboard). */
  mobilePrimaryChrome?: boolean
}

/** Hide MobileTabBar on immersive karaoke, sign-in, and internal admin. */
export function hidesTabBar(
  pathname: string | null | undefined,
  opts?: HidesTabBarOptions,
): boolean {
  const path = pathname?.split('?')[0] ?? ''
  if (chromeModeForPath(pathname) === 'immersive') return true
  if (isAuthPath(pathname)) {
    if (opts?.mobilePrimaryChrome && path === '/signin') return false
    return true
  }
  return isAdminPath(pathname) || isMessageThreadPath(pathname)
}
