import type { AuthorProfile } from '@/lib/profile-lookup'
import { peekAuthorProfileCache } from '@/lib/profile-lookup'

/** Only link to /profile when we have a live profile row (avoids dead legacy routes). */
export function profileHrefForAuthor(
  authorProfile: AuthorProfile | null,
  authorUid: string | null | undefined,
): string | null {
  const username = authorProfile?.username?.replace(/^@/, '').trim()
  if (!username) return null
  if (authorUid) {
    const cached = peekAuthorProfileCache(authorUid)
    if (cached === null) return null
  }
  return `/profile/${username}`
}

export function isFoundingListenerAuthor(
  authorProfile: AuthorProfile | null,
  authorUid: string | null | undefined,
): boolean {
  if (!authorUid || authorProfile) return false
  return peekAuthorProfileCache(authorUid) === null
}
