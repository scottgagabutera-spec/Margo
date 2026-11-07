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
const PEOPLE_EARLY = 5
const PEOPLE_FIRST_REGULAR = 14
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

function shouldInsertPeople(lyricOrdinal: number, nonReplayTotal: number, earlyPeopleDone: boolean): boolean {
  if (nonReplayTotal > 0 && nonReplayTotal < PEOPLE_FIRST_REGULAR && lyricOrdinal === PEOPLE_EARLY && !earlyPeopleDone) {
    return true
  }
  if (lyricOrdinal >= PEOPLE_FIRST_REGULAR && (lyricOrdinal - PEOPLE_FIRST_REGULAR) % PEOPLE_EVERY === 0) {
    return true
  }
  return false
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
  const peopleUsed = new Set<string>()
  const out: FeedLyricsRow[] = []
  let lyricOrdinal = 0
  let earlyPeopleDone = false
  const nonReplayTotal = lyricPosts.filter((row) => row.kind === 'post' && !row.isReplay).length
  const nudgeAtStart = showMemoryNudge && nonReplayTotal < NUDGE_AFTER
  if (nudgeAtStart) {
    out.push({ kind: 'memory-nudge', key: 'memory-nudge-once' })
  }

  for (const item of lyricPosts) {
    if (item.kind !== 'post') continue
    out.push(item)
    if (item.isReplay) continue
    lyricOrdinal += 1

    if (showMemoryNudge && !nudgeAtStart && lyricOrdinal === NUDGE_AFTER) {
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

    if (shouldInsertPeople(lyricOrdinal, nonReplayTotal, earlyPeopleDone)) {
      const prev = out[out.length - 2]
      const prevPrev = out[out.length - 3]
      if (prev?.kind === 'memory-carousel' || prevPrev?.kind === 'memory-carousel') continue
      const people = pickPeople(peoplePool, peopleUsed)
      if (people.length > 0) {
        if (lyricOrdinal === PEOPLE_EARLY && nonReplayTotal < PEOPLE_FIRST_REGULAR) earlyPeopleDone = true
        out.push({ kind: 'people', key: `people-${lyricOrdinal}`, people })
      }
    }
  }

  return out
}
