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
  | { kind: 'memory'; key: string; memory: MemoryPublic }
  | { kind: 'people'; key: string; people: FeedLyricsPeopleSlot[] }
  | { kind: 'memory-nudge'; key: string }

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
      const memory = memories[memIdx]
      memIdx += 1
      out.push({ kind: 'memory', key: `memory-${memory.id}-${lyricOrdinal}`, memory })
    }

    if (lyricOrdinal > 0 && lyricOrdinal % PEOPLE_EVERY === 0) {
      const prev = out[out.length - 2]
      const prevPrev = out[out.length - 3]
      if (prev?.kind === 'memory' || prevPrev?.kind === 'memory') continue
      const people = pickPeople(peoplePool, peopleUsed)
      if (people.length > 0) {
        out.push({ kind: 'people', key: `people-${lyricOrdinal}`, people })
      }
    }
  }

  return out
}
