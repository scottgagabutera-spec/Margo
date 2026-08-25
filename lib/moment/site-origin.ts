/** Canonical production origin for OG metadata and absolute links. */
export const MARGO_SITE_ORIGIN = 'https://trymargo.com'

/**
 * Origin for share links created in the browser.
 * Preview / local deployments should share URLs on the same host so
 * /m/{id} resolves against the DB the post was created in.
 */
export function resolveMomentShareOrigin(): string {
  if (typeof window !== 'undefined') {
    const { origin, hostname } = window.location
    if (hostname === 'localhost' || hostname.endsWith('.vercel.app')) {
      return origin
    }
    if (hostname === 'trymargo.com' || hostname.endsWith('.trymargo.com')) {
      return origin
    }
  }

  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL
  if (vercel && !vercel.includes('trymargo.com')) {
    return vercel.startsWith('http') ? vercel : `https://${vercel}`
  }

  return MARGO_SITE_ORIGIN
}
