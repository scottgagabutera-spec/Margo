/**
 * Safe runtime metadata for TikTok promote env (never full secrets).
 * TikTok client_key is semi-public (OAuth redirect); client_secret is not.
 */

import {
  resolveTikTokPromoteMode,
  type TikTokPromoteMode,
} from '@/lib/promote/tiktok-promote-config'

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

export interface TikTokCredentialSlotDiagnostics {
  configured: boolean
  clientKeyLength: number
  clientKeyPrefix: string | null
  clientKeyFormat: TikTokClientKeyFormat
  clientSecretLength: number
}

function slotFromEnv(
  keyEnv: string | undefined,
  secretEnv: string | undefined,
): TikTokCredentialSlotDiagnostics {
  const key = keyEnv?.trim() ?? ''
  const secret = secretEnv?.trim() ?? ''
  return {
    configured: key.length > 0 && secret.length > 0,
    clientKeyLength: key.length,
    clientKeyPrefix: key.length > 0 ? safePrefix(key) : null,
    clientKeyFormat: classifyTikTokClientKey(key),
    clientSecretLength: secret.length,
  }
}

export interface TikTokPromoteEnvDiagnostics {
  promoteMode: TikTokPromoteMode
  /** Active slot (what OAuth uses today). Same fields as before for env-check consumers. */
  clientKeyConfigured: boolean
  clientKeyLength: number
  clientKeyPrefix: string | null
  clientKeyFormat: TikTokClientKeyFormat
  clientSecretConfigured: boolean
  clientSecretLength: number
  production: TikTokCredentialSlotDiagnostics
  sandbox: TikTokCredentialSlotDiagnostics
}

export function getTikTokPromoteEnvDiagnostics(): TikTokPromoteEnvDiagnostics {
  const promoteMode = resolveTikTokPromoteMode()
  const production = slotFromEnv(
    process.env.TIKTOK_PROMOTE_CLIENT_KEY,
    process.env.TIKTOK_PROMOTE_CLIENT_SECRET,
  )
  const sandbox = slotFromEnv(
    process.env.TIKTOK_SANDBOX_CLIENT_KEY,
    process.env.TIKTOK_SANDBOX_CLIENT_SECRET,
  )
  const active = promoteMode === 'sandbox' ? sandbox : production

  return {
    promoteMode,
    clientKeyConfigured: active.configured,
    clientKeyLength: active.clientKeyLength,
    clientKeyPrefix: active.clientKeyPrefix,
    clientKeyFormat: active.clientKeyFormat,
    clientSecretConfigured: active.clientSecretLength > 0 && active.clientKeyLength > 0,
    clientSecretLength: active.clientSecretLength,
    production,
    sandbox,
  }
}
