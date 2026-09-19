import { sanitizeOAuthReturnPath } from '@/lib/oauth-return'

export type OAuthSurfaceErrorCode = 'auth' | 'terms'

/** Query param used when OAuth fails but the user should stay on their origin page. */
export const AUTH_GATE_ERROR_PARAM = 'auth_error'

export function parseAuthGateErrorCode(value: string | null | undefined): OAuthSurfaceErrorCode | null {
  if (value === 'auth' || value === 'terms') return value
  return null
}

export function authGateErrorMessage(code: OAuthSurfaceErrorCode): string {
  if (code === 'terms') {
    return 'Please agree to the Terms of Service and Privacy Policy before creating an account.'
  }
  return 'Sign-in was interrupted. Please try again.'
}

/**
 * OAuth failure redirect: return to origin page with auth_error when possible,
 * otherwise fall back to full /signin with legacy error= param.
 */
export function buildOAuthErrorRedirectUrl(
  origin: string,
  returnTo: string | null | undefined,
  code: OAuthSurfaceErrorCode,
  opts?: { mode?: 'signup' },
): string {
  const safeReturn = sanitizeOAuthReturnPath(returnTo)
  if (safeReturn && safeReturn !== '/signin') {
    const url = new URL(safeReturn, origin)
    url.searchParams.set(AUTH_GATE_ERROR_PARAM, code)
    return `${url.pathname}${url.search}`
  }

  const params = new URLSearchParams()
  params.set('error', code === 'terms' ? 'terms' : 'auth')
  if (opts?.mode === 'signup') params.set('mode', 'signup')
  return `/signin?${params.toString()}`
}

export function buildOAuthErrorRedirectResponse(
  origin: string,
  returnTo: string | null | undefined,
  code: OAuthSurfaceErrorCode,
  opts?: { mode?: 'signup' },
): string {
  return `${origin}${buildOAuthErrorRedirectUrl(origin, returnTo, code, opts)}`
}
