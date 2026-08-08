/**
 * Auth core — shared flags for server-owned session cookies.
 * Refresh material must never be readable from document.cookie.
 */
export const supabaseCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
}
