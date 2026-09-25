import type { PromoteQueueRow } from '@/lib/promote/types'

const CACHE_TTL_MS = 3 * 60 * 1000

type CacheEntry = {
  items: PromoteQueueRow[]
  fetchedAt: number
}

let sessionCache: CacheEntry | null = null

export function readPromoteQueueSessionCache(maxAgeMs = CACHE_TTL_MS): PromoteQueueRow[] | null {
  if (!sessionCache) return null
  if (Date.now() - sessionCache.fetchedAt > maxAgeMs) return null
  return sessionCache.items
}

export function writePromoteQueueSessionCache(items: PromoteQueueRow[]): void {
  sessionCache = { items, fetchedAt: Date.now() }
}

export function clearPromoteQueueSessionCache(): void {
  sessionCache = null
}
