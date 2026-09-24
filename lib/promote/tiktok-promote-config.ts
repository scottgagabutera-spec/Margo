export type TikTokPromoteMode = 'production' | 'sandbox'

export interface TikTokPromoteCredentials {
  mode: TikTokPromoteMode
  clientKey: string
  clientSecret: string
}

/** Defaults to production when unset or unrecognized. */
export function resolveTikTokPromoteMode(): TikTokPromoteMode {
  const raw = process.env.TIKTOK_PROMOTE_MODE?.trim().toLowerCase()
  if (raw === 'sandbox') return 'sandbox'
  return 'production'
}

function readProductionCredentials(): { clientKey: string; clientSecret: string } | null {
  const clientKey = process.env.TIKTOK_PROMOTE_CLIENT_KEY?.trim() ?? ''
  const clientSecret = process.env.TIKTOK_PROMOTE_CLIENT_SECRET?.trim() ?? ''
  if (!clientKey || !clientSecret) return null
  return { clientKey, clientSecret }
}

function readSandboxCredentials(): { clientKey: string; clientSecret: string } | null {
  const clientKey = process.env.TIKTOK_SANDBOX_CLIENT_KEY?.trim() ?? ''
  const clientSecret = process.env.TIKTOK_SANDBOX_CLIENT_SECRET?.trim() ?? ''
  if (!clientKey || !clientSecret) return null
  return { clientKey, clientSecret }
}

/** Credentials used for OAuth + token refresh (based on TIKTOK_PROMOTE_MODE). */
export function getActiveTikTokPromoteCredentials(): TikTokPromoteCredentials {
  const mode = resolveTikTokPromoteMode()
  const creds = mode === 'sandbox' ? readSandboxCredentials() : readProductionCredentials()
  if (!creds) {
    if (mode === 'sandbox') {
      throw new Error(
        'TIKTOK_SANDBOX_CLIENT_KEY and TIKTOK_SANDBOX_CLIENT_SECRET must be set when TIKTOK_PROMOTE_MODE=sandbox',
      )
    }
    throw new Error('TIKTOK_PROMOTE_CLIENT_KEY and TIKTOK_PROMOTE_CLIENT_SECRET must be configured')
  }
  return { mode, ...creds }
}
