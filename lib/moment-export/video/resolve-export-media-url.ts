/** Trusted R2 host for catalog audio + artwork. */
export const MARGO_AUDIO_HOST = 'audio.trymargo.com'

const ALLOWED_PATH_PREFIXES = ['/Margo/audio/', '/Margo/artwork/'] as const

export function isAllowedExportMediaUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return false
    if (parsed.hostname !== MARGO_AUDIO_HOST) return false
    return ALLOWED_PATH_PREFIXES.some((prefix) => parsed.pathname.startsWith(prefix))
  } catch {
    return false
  }
}

/** Preview / local hosts cannot fetch R2 audio directly (CORS). Use same-origin proxy. */
export function shouldProxyExportMedia(): boolean {
  if (typeof window === 'undefined') return false
  const { hostname } = window.location
  if (hostname === 'trymargo.com' || hostname.endsWith('.trymargo.com')) return false
  return true
}

export function resolveExportMediaFetchUrl(mediaUrl: string): string {
  if (!mediaUrl?.trim()) return mediaUrl
  if (!shouldProxyExportMedia()) return mediaUrl
  if (!isAllowedExportMediaUrl(mediaUrl)) return mediaUrl
  const params = new URLSearchParams({ url: mediaUrl })
  return `/api/moment-export/media?${params.toString()}`
}
