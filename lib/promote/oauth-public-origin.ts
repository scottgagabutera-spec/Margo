import type { NextRequest } from 'next/server'

/** Production promote OAuth redirect base (must match TikTok / Meta / Google app settings). */
const PRODUCTION_PROMOTE_ORIGIN = 'https://trymargo.com'

/**
 * Canonical origin for promote OAuth redirect_uri (authorize + token exchange must match).
 * Prefer PROMOTE_OAUTH_PUBLIC_ORIGIN; on Vercel production default to trymargo.com.
 */
export function resolvePromoteOAuthOrigin(request: NextRequest): string {
  const configured = process.env.PROMOTE_OAUTH_PUBLIC_ORIGIN?.trim()
  if (configured) {
    return configured.replace(/\/$/, '')
  }
  if (process.env.VERCEL_ENV === 'production') {
    return PRODUCTION_PROMOTE_ORIGIN
  }
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
  if (forwardedHost) {
    const host = forwardedHost.split(',')[0]?.trim()
    if (host) return `${forwardedProto}://${host}`
  }
  return new URL(request.url).origin
}
