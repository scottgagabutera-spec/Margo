import type { FeedLyricsPeopleSlot } from '@/lib/feed-lyrics-mix'

export type PeoplePoolInput = {
  fromPosts: FeedLyricsPeopleSlot[]
  suggestions: FeedLyricsPeopleSlot[]
  myId: string | null | undefined
  followingIds: Set<string>
  blockedIds?: Set<string>
}

/** Merge post authors and server suggestions; never self, following, or blocked. */
export function buildFeedPeoplePool(input: PeoplePoolInput): FeedLyricsPeopleSlot[] {
  const blocked = input.blockedIds ?? new Set<string>()
  const seen = new Set<string>()
  const out: FeedLyricsPeopleSlot[] = []
  const all = [...input.fromPosts, ...input.suggestions]
  for (const p of all) {
    if (!p.id || !p.username) continue
    if (p.id === input.myId) continue
    if (input.followingIds.has(p.id)) continue
    if (blocked.has(p.id)) continue
    if (seen.has(p.id)) continue
    seen.add(p.id)
    out.push(p)
    if (out.length >= 24) break
  }
  return out
}
