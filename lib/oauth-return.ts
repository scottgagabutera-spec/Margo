/** Short-lived cookie: post-OAuth redirect target (path only, e.g. /compose). */
export const OAUTH_RETURN_COOKIE = 'margo_oauth_return'

export const OAUTH_RETURN_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 10,
}

/** Only allow same-origin relative paths — no open redirects. */
export function sanitizeOAuthReturnPath(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null
  if (trimmed.includes('://')) return null
  return trimmed
}
