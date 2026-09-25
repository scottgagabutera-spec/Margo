import type { PromotePublishMode, SocialConnectionPublic } from '@/lib/promote/types'

const CACHE_TTL_MS = 3 * 60 * 1000

type CacheEntry = {
  connections: SocialConnectionPublic[]
  publishMode: PromotePublishMode
  fetchedAt: number
}

let sessionCache: CacheEntry | null = null

export function readPromoteConnectionsSessionCache(maxAgeMs = CACHE_TTL_MS): CacheEntry | null {
  if (!sessionCache) return null
  if (Date.now() - sessionCache.fetchedAt > maxAgeMs) return null
  return sessionCache
}

export function writePromoteConnectionsSessionCache(
  connections: SocialConnectionPublic[],
  publishMode: PromotePublishMode,
): void {
  sessionCache = { connections, publishMode, fetchedAt: Date.now() }
}

export function clearPromoteConnectionsSessionCache(): void {
  sessionCache = null
}
