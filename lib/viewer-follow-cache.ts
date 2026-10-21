import type { FollowStatus } from '@/lib/message-eligibility'

const KEY = 'margo:viewer-follow'

export function followCacheKey(viewerId: string, profileId: string): string {
  return `${viewerId}:${profileId}`
}

export function readViewerFollowCache(viewerId: string, profileId: string): FollowStatus | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = sessionStorage.getItem(`${KEY}:${followCacheKey(viewerId, profileId)}`)
    if (raw === 'pending' || raw === 'accepted') return raw
    if (raw === 'none') return null
    return undefined
  } catch {
    return undefined
  }
}

export function writeViewerFollowCache(viewerId: string, profileId: string, status: FollowStatus) {
  if (typeof window === 'undefined') return
  try {
    const value = status === null ? 'none' : status
    sessionStorage.setItem(`${KEY}:${followCacheKey(viewerId, profileId)}`, value)
  } catch {
    /* quota */
  }
}
