import { sanitizeOAuthReturnPath } from '@/lib/oauth-return'

/** Session snapshot paired with returnTo — survives OAuth round-trips. */
export const AUTH_RETURN_SCROLL_KEY = 'margo_auth_return_scroll'

const AUTH_RETURN_MAX_MS = 60 * 60 * 1000

export type AuthReturnScroll = {
  path: string
  scrollY: number
  at: number
}

function readWindowScrollY(): number {
  if (typeof document === 'undefined') return 0
  const el = document.querySelector<HTMLElement>(
    '[data-margo-primary-tab][data-margo-primary-tab-active="1"]',
  )
  if (el) return el.scrollTop
  if (typeof window === 'undefined') return 0
  return window.scrollY || document.documentElement.scrollTop || 0
}

function restoreWindowScrollY(y: number): void {
  if (typeof document === 'undefined') return
  const el = document.querySelector<HTMLElement>(
    '[data-margo-primary-tab][data-margo-primary-tab-active="1"]',
  )
  if (el) {
    el.scrollTo({ top: y, behavior: 'auto' })
    return
  }
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: y, behavior: 'auto' })
  }
}

export function currentReturnPath(): string {
  if (typeof window === 'undefined') return '/feed'
  return `${window.location.pathname}${window.location.search}`
}

/** Persist scroll for the path the user is leaving — call before auth navigation. */
export function captureAuthReturnScroll(path?: string): string {
  const returnPath = sanitizeOAuthReturnPath(path) ?? sanitizeOAuthReturnPath(currentReturnPath()) ?? '/feed'
  const payload: AuthReturnScroll = {
    path: returnPath,
    scrollY: readWindowScrollY(),
    at: Date.now(),
  }
  try {
    sessionStorage.setItem(AUTH_RETURN_SCROLL_KEY, JSON.stringify(payload))
  } catch {
    /* private mode */
  }
  return returnPath
}

function readStoredScroll(): AuthReturnScroll | null {
  try {
    const raw = sessionStorage.getItem(AUTH_RETURN_SCROLL_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthReturnScroll
    if (typeof parsed.path !== 'string' || typeof parsed.scrollY !== 'number' || typeof parsed.at !== 'number') {
      return null
    }
    if (Date.now() - parsed.at > AUTH_RETURN_MAX_MS) return null
    return parsed
  } catch {
    return null
  }
}

export function clearAuthReturnScroll(): void {
  try {
    sessionStorage.removeItem(AUTH_RETURN_SCROLL_KEY)
  } catch {
    /* private mode */
  }
}

/** Restore scroll when the user lands back on the saved path after auth. */
export function restoreAuthReturnScroll(expectedPath?: string | null): boolean {
  const stored = readStoredScroll()
  if (!stored) return false
  const path = expectedPath ?? currentReturnPath()
  if (stored.path !== path) return false
  if (stored.scrollY < 1) {
    clearAuthReturnScroll()
    return false
  }

  let attempts = 0
  const apply = () => {
    attempts += 1
    restoreWindowScrollY(stored.scrollY)
    const current = readWindowScrollY()
    if (Math.abs(current - stored.scrollY) <= 2 || attempts >= 8) {
      clearAuthReturnScroll()
      return
    }
    requestAnimationFrame(apply)
  }

  requestAnimationFrame(apply)
  return true
}

export function formatSigninHref(opts?: {
  returnTo?: string
  mode?: 'signup' | 'signin'
  step?: 'terms'
  error?: string
}): string {
  const returnPath = sanitizeOAuthReturnPath(opts?.returnTo) ?? '/feed'
  const params = new URLSearchParams()
  if (opts?.mode === 'signup') params.set('mode', 'signup')
  if (opts?.step === 'terms') params.set('step', 'terms')
  if (opts?.error) params.set('error', opts.error)
  params.set('returnTo', returnPath)
  return `/signin?${params.toString()}`
}

/** Capture scroll + build /signin href in one step (OAuth start). */
export function buildSigninHref(opts?: {
  returnTo?: string
  mode?: 'signup' | 'signin'
  step?: 'terms'
  error?: string
}): string {
  const returnPath = captureAuthReturnScroll(opts?.returnTo)
  return formatSigninHref({ ...opts, returnTo: returnPath })
}

export function resolvePostAuthPath(returnToParam: string | null | undefined, fallback = '/feed'): string {
  return sanitizeOAuthReturnPath(returnToParam) ?? fallback
}
