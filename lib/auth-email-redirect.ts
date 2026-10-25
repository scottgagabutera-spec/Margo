import type { NextRequest } from 'next/server'

const PRODUCTION_ORIGIN = 'https://trymargo.com'

/** Vercel preview hosts for this repo (extend when preview URL pattern changes). */
const ALLOWED_PREVIEW_HOST_SUFFIXES = [
  '-bgss-projects-0f517fe3.vercel.app',
  '.vercel.app',
] as const

function hostAllowed(host: string): boolean {
  const h = host.toLowerCase().split(':')[0]
  if (h === 'trymargo.com' || h === 'www.trymargo.com' || h === 'localhost') return true
  for (const suffix of ALLOWED_PREVIEW_HOST_SUFFIXES) {
    if (h.endsWith(suffix.replace(/^\./, '')) || (suffix.startsWith('.') && h.endsWith(suffix))) {
      return true
    }
  }
  if (h.startsWith('margo-git-') && h.endsWith('.vercel.app')) return true
  return false
}

export function resolveAuthEmailRedirectOriginFromHost(host: string | null, proto = 'https'): string {
  if (!host || !hostAllowed(host)) return PRODUCTION_ORIGIN
  return `${proto}://${host.split(',')[0].trim()}`
}

export function resolveAuthEmailRedirectOrigin(req: NextRequest): string {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  return resolveAuthEmailRedirectOriginFromHost(host, proto)
}

export function signInAfterConfirmUrl(origin: string): string {
  return `${origin.replace(/\/$/, '')}/signin?confirmed=1`
}

export function resetPasswordRedirectUrl(origin: string): string {
  return `${origin.replace(/\/$/, '')}/reset-password`
}
