import { sanitizeOAuthReturnPath } from '@/lib/oauth-return'

export const AUTH_RETURN_QUERY = 'returnTo'
const AUTH_RETURN_SCROLL_KEY = 'margo-auth-return-scroll'
const AUTH_RETURN_SCROLL_MAX_MS = 10 * 60 * 1000

export type AuthModeParam = 'signup' | 'signin'

/** Same-origin path only. Never bounce back onto /signin itself. */
export function sanitizeAuthReturnPath(value: string | null | undefined): string | null {
  const safe = sanitizeOAuthReturnPath(value)
  if (!safe) return null
  const pathOnly = safe.split('?')[0]
  if (pathOnly === '/signin' || pathOnly === '/auth/callback') return null
  return safe
}

export function currentReturnTo(): string {
  if (typeof window === 'undefined') return '/feed'
  return `${window.location.pathname}${window.location.search}`
}

export function buildSigninHref(
  returnTo?: string | null,
  opts?: { mode?: AuthModeParam; step?: string },
): string {
  const params = new URLSearchParams()
  const safe = sanitizeAuthReturnPath(returnTo)
  if (safe) params.set(AUTH_RETURN_QUERY, safe)
  if (opts?.mode) params.set('mode', opts.mode)
  if (opts?.step) params.set('step', opts.step)
  const qs = params.toString()
  return qs ? `/signin?${qs}` : '/signin'
}

export function persistAuthReturnScroll(path?: string) {
  if (typeof window === 'undefined') return
  try {
    const here = path ?? currentReturnTo()
    const y = window.scrollY || document.documentElement.scrollTop || 0
    sessionStorage.setItem(
      AUTH_RETURN_SCROLL_KEY,
      JSON.stringify({ path: here, y, at: Date.now() }),
    )
  } catch {
    /* private mode */
  }
}

export function consumeAuthReturnScroll(currentPath: string): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(AUTH_RETURN_SCROLL_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { path?: string; y?: number; at?: number }
    sessionStorage.removeItem(AUTH_RETURN_SCROLL_KEY)
    if (typeof parsed.y !== 'number' || typeof parsed.path !== 'string') return null
    if (typeof parsed.at === 'number' && Date.now() - parsed.at > AUTH_RETURN_SCROLL_MAX_MS) {
      return null
    }
    const here = currentPath.split('#')[0]
    const saved = parsed.path.split('#')[0]
    if (saved !== here && saved.split('?')[0] !== here.split('?')[0]) return null
    return parsed.y
  } catch {
    return null
  }
}
