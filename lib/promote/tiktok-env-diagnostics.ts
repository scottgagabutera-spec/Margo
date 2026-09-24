/**
 * Safe runtime metadata for TIKTOK_PROMOTE_* env vars (never full secrets).
 * TikTok client_key is semi-public (OAuth redirect); client_secret is not.
 */

export type TikTokClientKeyFormat =
  | 'missing'
  | 'stripe_secret_like'
  | 'tiktok_sandbox'
  | 'tiktok_production_like'
  | 'unknown'

const KEY_PREFIX_CHARS = 4

export function classifyTikTokClientKey(raw: string | undefined): TikTokClientKeyFormat {
  const key = raw?.trim() ?? ''
  if (!key) return 'missing'
  if (/^sk_(live|test)_/i.test(key)) return 'stripe_secret_like'
  if (/^sb[a-z0-9]/i.test(key)) return 'tiktok_sandbox'
  if (/^[a-z0-9]{8,32}$/i.test(key)) return 'tiktok_production_like'
  return 'unknown'
}

export function safePrefix(value: string, maxChars = KEY_PREFIX_CHARS): string {
  return value.slice(0, maxChars)
}

export interface TikTokPromoteEnvDiagnostics {
  clientKeyConfigured: boolean
  clientKeyLength: number
  /** First few characters only — enough to spot sk_live_ vs sb… vs prod shape */
  clientKeyPrefix: string | null
  clientKeyFormat: TikTokClientKeyFormat
  clientSecretConfigured: boolean
  clientSecretLength: number
}

export function getTikTokPromoteEnvDiagnostics(): TikTokPromoteEnvDiagnostics {
  const key = process.env.TIKTOK_PROMOTE_CLIENT_KEY?.trim() ?? ''
  const secret = process.env.TIKTOK_PROMOTE_CLIENT_SECRET?.trim() ?? ''
  const format = classifyTikTokClientKey(key)

  return {
    clientKeyConfigured: key.length > 0,
    clientKeyLength: key.length,
    clientKeyPrefix: key.length > 0 ? safePrefix(key) : null,
    clientKeyFormat: format,
    clientSecretConfigured: secret.length > 0,
    clientSecretLength: secret.length,
  }
}
