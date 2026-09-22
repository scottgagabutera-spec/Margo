/**
 * Cloudflare R2 (S3-compatible) — shared server-side config.
 *
 * Production catalog audio/artwork is served read-only at audio.trymargo.com
 * (paths like Margo/audio/*, Margo/artwork/*). Auto-Promote writes rendered
 * MP4s to the same bucket under Margo/promote/* — no separate bucket required.
 *
 * Note: the app has no other server-side R2 SDK usage today; Studio uploads
 * go to Supabase Storage (song-audio / song-artwork). These env vars are the
 * first server-side R2 write credentials the app needs.
 */

const DEFAULT_SIGNED_URL_EXPIRY_SEC = 3600
const DEFAULT_PUBLIC_MEDIA_HOST = 'audio.trymargo.com'

function firstEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim()
    if (value) return value
  }
  return undefined
}

export function r2AccountId(): string {
  const value = firstEnv('R2_ACCOUNT_ID', 'CLOUDFLARE_ACCOUNT_ID', 'CF_ACCOUNT_ID')
  if (!value) throw new Error('R2_ACCOUNT_ID (or CLOUDFLARE_ACCOUNT_ID) is not configured')
  return value
}

export function r2AccessKeyId(): string {
  const value = firstEnv('R2_ACCESS_KEY_ID', 'CLOUDFLARE_R2_ACCESS_KEY_ID', 'AWS_ACCESS_KEY_ID')
  if (!value) throw new Error('R2_ACCESS_KEY_ID is not configured')
  return value
}

export function r2SecretAccessKey(): string {
  const value = firstEnv('R2_SECRET_ACCESS_KEY', 'CLOUDFLARE_R2_SECRET_ACCESS_KEY', 'AWS_SECRET_ACCESS_KEY')
  if (!value) throw new Error('R2_SECRET_ACCESS_KEY is not configured')
  return value
}

/** Same bucket as audio.trymargo.com — promote objects use prefix Margo/promote/. */
export function r2BucketName(): string {
  return firstEnv('R2_BUCKET_NAME', 'CLOUDFLARE_R2_BUCKET_NAME') || 'margo'
}

export function r2SignedUrlExpirySec(): number {
  const raw = firstEnv('R2_SIGNED_URL_EXPIRY_SEC')
  if (!raw) return DEFAULT_SIGNED_URL_EXPIRY_SEC
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SIGNED_URL_EXPIRY_SEC
}

export function r2S3Endpoint(): string {
  return `https://${r2AccountId()}.r2.cloudflarestorage.com`
}

/** Public CDN host for stable promote MP4 URLs (same bucket as catalog audio). */
export function r2PublicMediaHost(): string {
  return firstEnv('MARGO_MEDIA_PUBLIC_HOST', 'R2_PUBLIC_MEDIA_HOST') || DEFAULT_PUBLIC_MEDIA_HOST
}
