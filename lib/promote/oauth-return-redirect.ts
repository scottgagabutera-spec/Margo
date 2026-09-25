import {
  MARGO_AUTO_PROMOTE_SETTINGS_HASH,
  MARGO_AUTO_PROMOTE_SETTINGS_PATH,
} from '@/lib/promote/settings-anchor'

/**
 * Safe same-origin return path for promote OAuth (pathname + optional hash; query stripped).
 * Ensures Settings returns scroll to Auto-Promote when hash omitted.
 */
export function normalizePromoteOAuthReturnPath(raw: string | undefined | null): string {
  const fallback = MARGO_AUTO_PROMOTE_SETTINGS_PATH
  if (!raw?.startsWith('/')) return fallback
  const pathOnly = raw.split('#')[0]?.split('?')[0] ?? ''
  if (!pathOnly.startsWith('/') || pathOnly.startsWith('//')) return fallback
  const hashIdx = raw.indexOf('#')
  const beforeHash = hashIdx >= 0 ? raw.slice(0, hashIdx) : raw
  const hashPart = hashIdx >= 0 ? raw.slice(hashIdx).split('?')[0] : ''
  const pathname = beforeHash.split('?')[0] ?? beforeHash
  if (hashPart.includes(MARGO_AUTO_PROMOTE_SETTINGS_HASH)) {
    return `${pathname}${hashPart}`
  }
  return `${pathname}#${MARGO_AUTO_PROMOTE_SETTINGS_HASH}`
}

/**
 * OAuth callback redirect: query (?promote=) before fragment (#anchor).
 * Fixes /settings#anchor?promote=… where search params were lost client-side.
 */
export function buildPromoteOAuthReturnUrl(
  origin: string,
  returnTo: string | undefined | null,
  promote: string,
): string {
  const normalized = normalizePromoteOAuthReturnPath(returnTo)
  const hashIdx = normalized.indexOf('#')
  const pathPart = hashIdx >= 0 ? normalized.slice(0, hashIdx) : normalized
  const hashPart = hashIdx >= 0 ? normalized.slice(hashIdx) : ''

  const qIdx = pathPart.indexOf('?')
  const pathname = qIdx >= 0 ? pathPart.slice(0, qIdx) : pathPart
  const existingQuery = qIdx >= 0 ? pathPart.slice(qIdx + 1) : ''

  const params = new URLSearchParams(existingQuery)
  params.set('promote', promote)
  const base = origin.replace(/\/$/, '')
  return `${base}${pathname}?${params.toString()}${hashPart}`
}

/** Read ?promote= from search or legacy hash query (pre-fix URLs). */
export function readPromoteOAuthReturnParam(search: string, hash: string): string | null {
  const q = search.startsWith('?') ? search.slice(1) : search
  const fromSearch = new URLSearchParams(q).get('promote')
  if (fromSearch) return fromSearch

  if (!hash) return null
  const hashBody = hash.startsWith('#') ? hash.slice(1) : hash
  const queryStart = hashBody.indexOf('?')
  if (queryStart < 0) return null
  return new URLSearchParams(hashBody.slice(queryStart + 1)).get('promote')
}

/** Strip promote from URL after handling OAuth return (search + legacy hash). */
export function buildPathAfterPromoteOAuthHandled(
  pathname: string,
  search: string,
  hash: string,
): string {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  params.delete('promote')
  const qs = params.toString()

  const anchor = `#${MARGO_AUTO_PROMOTE_SETTINGS_HASH}`
  let cleanHash = hash || ''
  if (cleanHash.startsWith(`${anchor}?`) || cleanHash.startsWith(`${anchor}&`)) {
    cleanHash = anchor
  }

  return `${pathname}${qs ? `?${qs}` : ''}${cleanHash}`
}
