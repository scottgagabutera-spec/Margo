import { resolveTikTokPromoteMode } from '@/lib/promote/tiktok-promote-config'

export type TikTokPrivacyLevel =
  | 'PUBLIC_TO_EVERYONE'
  | 'MUTUAL_FOLLOW_FRIENDS'
  | 'FOLLOWER_OF_CREATOR'
  | 'SELF_ONLY'

/** Set to true only after TikTok App Review clears public posting. */
export function isTikTokPromoteAppAudited(): boolean {
  return process.env.TIKTOK_PROMOTE_APP_AUDITED?.trim().toLowerCase() === 'true'
}

function configuredPrivacyFromEnv(): TikTokPrivacyLevel | null {
  const raw = process.env.TIKTOK_PROMOTE_PRIVACY_LEVEL?.trim()
  if (
    raw === 'PUBLIC_TO_EVERYONE'
    || raw === 'MUTUAL_FOLLOW_FRIENDS'
    || raw === 'FOLLOWER_OF_CREATOR'
    || raw === 'SELF_ONLY'
  ) {
    return raw
  }
  return null
}

/**
 * Privacy for unaudited / sandbox apps is always SELF_ONLY.
 * After audit, honor TIKTOK_PROMOTE_PRIVACY_LEVEL (default SELF_ONLY).
 */
export function resolveTikTokPromotePrivacyPreference(): TikTokPrivacyLevel {
  if (!isTikTokPromoteAppAudited()) {
    return 'SELF_ONLY'
  }
  return configuredPrivacyFromEnv() ?? 'SELF_ONLY'
}

export function pickTikTokPublishPrivacyLevel(
  options: TikTokPrivacyLevel[],
  preference: TikTokPrivacyLevel,
): TikTokPrivacyLevel {
  const unaudited = !isTikTokPromoteAppAudited() || resolveTikTokPromoteMode() === 'sandbox'
  const desired = unaudited ? 'SELF_ONLY' : preference

  if (options.length === 0 && unaudited) {
    throw new Error(
      'TikTok returned no privacy options for this account. For unaudited apps, set the TikTok account to Private (Settings → Privacy), then try again.',
    )
  }

  if (options.includes(desired)) return desired
  if (options.includes('SELF_ONLY')) return 'SELF_ONLY'

  if (unaudited) {
    throw new Error(
      'TikTok requires a private creator account for unaudited apps. In the TikTok app: Settings → Privacy → turn on Private account, then try promote again.',
    )
  }

  throw new Error(
    `TikTok privacy "${desired}" is not available for this account (options: ${options.join(', ') || 'none'}).`,
  )
}
