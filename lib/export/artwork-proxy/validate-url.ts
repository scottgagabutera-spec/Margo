const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.goog',
])

const PRIVATE_IPV4_RANGES = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
]

function isPrivateIpv4(host: string): boolean {
  return PRIVATE_IPV4_RANGES.some((re) => re.test(host))
}

function isPrivateIpv6(host: string): boolean {
  const normalized = host.toLowerCase()
  return (
    normalized === '::1'
    || normalized === '::'
    || normalized.startsWith('fc')
    || normalized.startsWith('fd')
    || normalized.startsWith('fe80')
  )
}

export class ArtworkProxyUrlError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ArtworkProxyUrlError'
  }
}

/** Validate a remote artwork URL before server-side fetch (SSRF guard). */
export function validateArtworkProxyUrl(raw: string): URL {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new ArtworkProxyUrlError('invalid url')
  }

  if (parsed.protocol !== 'https:') {
    throw new ArtworkProxyUrlError('only https artwork urls are allowed')
  }

  if (parsed.username || parsed.password) {
    throw new ArtworkProxyUrlError('credentials in url are not allowed')
  }

  const host = parsed.hostname.toLowerCase()
  if (!host) throw new ArtworkProxyUrlError('missing hostname')

  if (BLOCKED_HOSTNAMES.has(host)) {
    throw new ArtworkProxyUrlError('hostname is not allowed')
  }

  if (host.endsWith('.local') || host.endsWith('.internal')) {
    throw new ArtworkProxyUrlError('hostname is not allowed')
  }

  if (host === '0.0.0.0' || host === '[::]') {
    throw new ArtworkProxyUrlError('hostname is not allowed')
  }

  // IPv4 literal
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) && isPrivateIpv4(host)) {
    throw new ArtworkProxyUrlError('private ip addresses are not allowed')
  }

  // IPv6 literal (strip brackets if present)
  const ipv6 = host.startsWith('[') ? host.slice(1, -1) : host
  if (ipv6.includes(':') && isPrivateIpv6(ipv6)) {
    throw new ArtworkProxyUrlError('private ip addresses are not allowed')
  }

  return parsed
}

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/svg+xml',
])

export function normalizeImageContentType(contentType: string | null): string | null {
  if (!contentType) return null
  const base = contentType.split(';')[0].trim().toLowerCase()
  return ALLOWED_IMAGE_TYPES.has(base) ? base : null
}

export const ARTWORK_PROXY_MAX_BYTES = 8 * 1024 * 1024
export const ARTWORK_PROXY_TIMEOUT_MS = 10_000
export const ARTWORK_PROXY_MAX_REDIRECTS = 3
