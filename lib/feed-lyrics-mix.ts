import type { MemoryPublic } from '@/lib/memory/types'
import type { Post } from '@/hooks/usePosts'
import type { MemoryPromoKind } from './feed-memory-card.ts'
import {
  planFeedCarouselSlots,
  planFeedPromoInserts,
  promoInsertsByPlacement,
  type FeedPromoKind,
} from './feed-promo-planner.ts'

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
  | { kind: 'people'; key: string; people: FeedLyricsPeopleSlot[]; planKey: string }
  | { kind: 'memory-promo'; key: string; promoKind: MemoryPromoKind; planKey: string }
  | { kind: 'shorts-strip'; key: string; planKey: string }

export const FEED_LYRICS_MEMORY_CAROUSEL_SIZE = 5

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

function promoToMemoryKind(kind: FeedPromoKind): MemoryPromoKind | null {
  if (kind === 'pictures' || kind === 'story' || kind === 'memory') return kind
  return null
}

export function buildFeedLyricsRows(input: {
  lyricPosts: FeedLyricsPostRow[]
  memories: MemoryPublic[]
  peoplePool: FeedLyricsPeopleSlot[]
  signedIn: boolean
  promoAnchor: number
  memoryCursorStart?: number
}): FeedLyricsRow[] {
  const { lyricPosts, memories, peoplePool, signedIn, promoAnchor } = input
  let memIdx = input.memoryCursorStart ?? 0
  const peopleUsed = new Set<string>()
  const out: FeedLyricsRow[] = []
  let lyricOrdinal = 0
  const nonReplayTotal = lyricPosts.filter((row) => row.kind === 'post' && !row.isReplay).length

  const promoPlan = planFeedPromoInserts({ nonReplayTotal, signedIn, promoAnchor })
  const { start: startInserts, after: afterInserts } = promoInsertsByPlacement(promoPlan)
  const carouselSlots = new Map(
    planFeedCarouselSlots(nonReplayTotal).map((s) => [s.lyricOrdinal, s.key] as const),
  )

  const pushPromo = (kind: FeedPromoKind, planKey: string) => {
    if (kind === 'people') {
      const people = pickPeople(peoplePool, peopleUsed)
      if (people.length > 0) {
        out.push({ kind: 'people', key: planKey, people, planKey })
      }
      return
    }
    if (kind === 'shorts') {
      out.push({ kind: 'shorts-strip', key: planKey, planKey })
      return
    }
    const promoKind = promoToMemoryKind(kind)
    if (promoKind && signedIn) {
      out.push({ kind: 'memory-promo', key: planKey, promoKind, planKey })
    }
  }

  for (const ins of startInserts) pushPromo(ins.kind, ins.key)

  for (const item of lyricPosts) {
    if (item.kind !== 'post') continue
    out.push(item)
    if (item.isReplay) continue
    lyricOrdinal += 1

    const after = afterInserts.get(lyricOrdinal)
    if (after) pushPromo(after.kind, after.key)

    const carouselKey = carouselSlots.get(lyricOrdinal)
    if (carouselKey && memories[memIdx]) {
      const chunk = memories.slice(memIdx, memIdx + FEED_LYRICS_MEMORY_CAROUSEL_SIZE)
      const hasMore = memIdx + chunk.length < memories.length
      memIdx += chunk.length
      out.push({
        kind: 'memory-carousel',
        key: carouselKey,
        memories: chunk,
        hasMore,
      })
    }
  }

  return out
}
