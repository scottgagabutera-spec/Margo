/** Short-lived cookie: post-OAuth redirect target (path only, e.g. /compose). */
export const OAUTH_RETURN_COOKIE = 'margo_oauth_return'

export const OAUTH_RETURN_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 10,
}

/** Internal /auth surfaces must never be post-login destinations. */
export function isInternalAuthReturnPath(pathOnly: string): boolean {
  if (pathOnly === '/admin' || pathOnly.startsWith('/admin/')) return true
  if (pathOnly.startsWith('/api/')) return true
  return false
}

/** Only allow same-origin relative paths — no open redirects. */
export function sanitizeOAuthReturnPath(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null
  if (trimmed.includes('://')) return null
  const pathOnly = trimmed.split('?')[0]
  if (isInternalAuthReturnPath(pathOnly)) return null
  return trimmed
}
