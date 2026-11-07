import type { ProfileSettingsJson } from '../welcome-profile-settings.ts'

export const TIPS_FROM_MARGO_KEY = 'tipsFromMargo' as const

export type ExtendedNotificationPrefs = {
  newFollower?: boolean
  newMessage?: boolean
  lyricBack?: boolean
  resonate?: boolean
  emailDigest?: boolean
  tipsFromMargo?: boolean
}

export function tipsFromMargoEnabled(settings: ProfileSettingsJson | null | undefined): boolean {
  const notifications = settings?.notifications
  if (!notifications || typeof notifications !== 'object') return true
  const pref = (notifications as ExtendedNotificationPrefs).tipsFromMargo
  return pref !== false
}
