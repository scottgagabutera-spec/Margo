const CACHE_TTL_MS = 5 * 60 * 1000

export type AccountSettingsCachePayload = {
  userId: string
  profile: Record<string, unknown>
  application: { status: string; submitted_at: string } | null
  notifications: Record<string, boolean>
  fetchedAt: number
}

let sessionCache: AccountSettingsCachePayload | null = null

export function readAccountSettingsSessionCache(
  userId: string,
  maxAgeMs = CACHE_TTL_MS,
): Omit<AccountSettingsCachePayload, 'fetchedAt'> | null {
  if (!sessionCache || sessionCache.userId !== userId) return null
  if (Date.now() - sessionCache.fetchedAt > maxAgeMs) return null
  return {
    userId: sessionCache.userId,
    profile: sessionCache.profile,
    application: sessionCache.application,
    notifications: sessionCache.notifications,
  }
}

export function writeAccountSettingsSessionCache(payload: Omit<AccountSettingsCachePayload, 'fetchedAt'>): void {
  sessionCache = { ...payload, fetchedAt: Date.now() }
}

export function clearAccountSettingsSessionCache(): void {
  sessionCache = null
}
