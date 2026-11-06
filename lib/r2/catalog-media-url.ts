/**
 * Public URLs for catalog objects on the Cloudflare-backed R2 host (same bucket as promote).
 * Client-safe — uses NEXT_PUBLIC_* for host override.
 */
const DEFAULT_HOST = 'audio.trymargo.com'

export function catalogMediaPublicHost(): string {
  const h = process.env.NEXT_PUBLIC_MARGO_MEDIA_PUBLIC_HOST?.trim()
  return h || DEFAULT_HOST
}

/** objectKey e.g. Margo/audio/{uid}/{songId}.mp3 */
export function publicCatalogMediaUrl(objectKey: string): string {
  const normalized = objectKey.replace(/^\/+/, '')
  return `https://${catalogMediaPublicHost()}/${normalized}`
}
