import type { MemoryPublic } from '@/lib/memory/types'
import type { Post } from '@/hooks/usePosts'

export type FeedLyricsPeopleSlot = {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
}

export type FeedLyricsPostRow = {
  kind: 'post'
  key: string
  post: Post
  sortAt: number
  isReplay: boolean
  quoteText?: string | null
  replayerUsername?: string | null
  replayerDisplayName?: string | null
  replayerAvatarUrl?: string | null
}

export type FeedLyricsRow =
  | FeedLyricsPostRow
  | { kind: 'memory-carousel'; key: string; memories: MemoryPublic[]; hasMore: boolean }
  | { kind: 'people'; key: string; people: FeedLyricsPeopleSlot[] }
  | { kind: 'memory-nudge'; key: string }

export const FEED_LYRICS_MEMORY_CAROUSEL_SIZE = 5

const MEMORY_EVERY = 6
const PEOPLE_EVERY = 15
const NUDGE_AFTER = 8

function pickPeople(authors: FeedLyricsPeopleSlot[], used: Set<string>, count = 4): FeedLyricsPeopleSlot[] {
  const out: FeedLyricsPeopleSlot[] = []
  for (const a of authors) {
    if (used.has(a.id)) continue
    used.add(a.id)
    out.push(a)
    if (out.length >= count) break
  }
  return out
}

export function buildFeedLyricsRows(input: {
  lyricPosts: FeedLyricsPostRow[]
  memories: MemoryPublic[]
  peoplePool: FeedLyricsPeopleSlot[]
  showMemoryNudge: boolean
  memoryCursorStart?: number
}): FeedLyricsRow[] {
  const { lyricPosts, memories, peoplePool, showMemoryNudge } = input
  let memIdx = input.memoryCursorStart ?? 0
  let peopleUsed = new Set<string>()
  const out: FeedLyricsRow[] = []
  let lyricOrdinal = 0

  for (const item of lyricPosts) {
    if (item.kind !== 'post') continue
    out.push(item)
    if (item.isReplay) continue
    lyricOrdinal += 1

    if (showMemoryNudge && lyricOrdinal === NUDGE_AFTER) {
      out.push({ kind: 'memory-nudge', key: 'memory-nudge-once' })
    }

    if (lyricOrdinal > 0 && lyricOrdinal % MEMORY_EVERY === 0 && memories[memIdx]) {
      const chunk = memories.slice(memIdx, memIdx + FEED_LYRICS_MEMORY_CAROUSEL_SIZE)
      const hasMore = memIdx + chunk.length < memories.length
      memIdx += chunk.length
      out.push({
        kind: 'memory-carousel',
        key: `memory-carousel-${chunk[0]?.id ?? lyricOrdinal}-${lyricOrdinal}`,
        memories: chunk,
        hasMore,
      })
    }

    if (lyricOrdinal >= 14 && (lyricOrdinal - 14) % PEOPLE_EVERY === 0) {
      const prev = out[out.length - 2]
      const prevPrev = out[out.length - 3]
      if (prev?.kind === 'memory-carousel' || prevPrev?.kind === 'memory-carousel') continue
      const people = pickPeople(peoplePool, peopleUsed)
      if (people.length > 0) {
        out.push({ kind: 'people', key: `people-${lyricOrdinal}`, people })
      }
    }
  }

  return out
}
