import type { MemoryPublic } from '@/lib/memory/types'
import type { Post } from '@/hooks/usePosts'
import type { MemoryPromoKind } from './feed-memory-card.ts'
import {
  FEED_BLOCK_CYCLE_SIGNED_IN,
  FEED_BLOCK_CYCLE_SIGNED_OUT,
  planFeedBlocks,
  promoInsertsByPlacement,
  type FeedBlockKind,
  type FeedPlannedBlock,
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

function peekPeople(authors: FeedLyricsPeopleSlot[], used: Set<string>, count = 4): FeedLyricsPeopleSlot[] {
  const out: FeedLyricsPeopleSlot[] = []
  for (const a of authors) {
    if (used.has(a.id)) continue
    out.push(a)
    if (out.length >= count) break
  }
  return out
}

function pickPeople(authors: FeedLyricsPeopleSlot[], used: Set<string>, count = 4): FeedLyricsPeopleSlot[] {
  const out = peekPeople(authors, used, count)
  for (const a of out) used.add(a.id)
  return out
}

function promoToMemoryKind(kind: FeedBlockKind): MemoryPromoKind | null {
  if (kind === 'pictures' || kind === 'story' || kind === 'memory') return kind
  return null
}

type BlockCtx = {
  signedIn: boolean
  memories: MemoryPublic[]
  memIdx: number
  peoplePool: FeedLyricsPeopleSlot[]
  peopleUsed: Set<string>
  shortsStripAvailable: boolean
}

function cycleFor(signedIn: boolean): FeedBlockKind[] {
  return signedIn ? FEED_BLOCK_CYCLE_SIGNED_IN : FEED_BLOCK_CYCLE_SIGNED_OUT
}

function canMaterialize(kind: FeedBlockKind, ctx: BlockCtx): boolean {
  switch (kind) {
    case 'pictures':
    case 'story':
    case 'memory':
      return ctx.signedIn
    case 'carousel':
      return ctx.memories.length > ctx.memIdx
    case 'people':
      return peekPeople(ctx.peoplePool, ctx.peopleUsed).length > 0
    case 'shorts':
      return ctx.shortsStripAvailable
    default:
      return false
  }
}

type MaterializeResult = { row: FeedLyricsRow | null; nextCycleIndex: number; consumedMemories: number }

function materializeBlock(
  plannedKind: FeedBlockKind,
  cycle: FeedBlockKind[],
  planKey: string,
  ctx: BlockCtx,
): MaterializeResult {
  const startIdx = cycle.indexOf(plannedKind)
  const begin = startIdx >= 0 ? startIdx : 0
  for (let attempt = 0; attempt < cycle.length; attempt += 1) {
    const kind = cycle[(begin + attempt) % cycle.length]!
    const key = attempt === 0 ? planKey : `${planKey}-skip-${kind}`
    if (!canMaterialize(kind, ctx)) continue

    if (kind === 'people') {
      const people = pickPeople(ctx.peoplePool, ctx.peopleUsed)
      if (people.length > 0) {
        return {
          row: { kind: 'people', key, people, planKey: key },
          nextCycleIndex: (begin + attempt + 1) % cycle.length,
          consumedMemories: 0,
        }
      }
    }
    if (kind === 'shorts') {
      return {
        row: { kind: 'shorts-strip', key, planKey: key },
        nextCycleIndex: (begin + attempt + 1) % cycle.length,
        consumedMemories: 0,
      }
    }
    if (kind === 'carousel') {
      const chunk = ctx.memories.slice(ctx.memIdx, ctx.memIdx + FEED_LYRICS_MEMORY_CAROUSEL_SIZE)
      if (chunk.length > 0) {
        const hasMore = ctx.memIdx + chunk.length < ctx.memories.length
        return {
          row: { kind: 'memory-carousel', key, memories: chunk, hasMore },
          nextCycleIndex: (begin + attempt + 1) % cycle.length,
          consumedMemories: chunk.length,
        }
      }
    }
    const promoKind = promoToMemoryKind(kind)
    if (promoKind) {
      return {
        row: { kind: 'memory-promo', key, promoKind, planKey: key },
        nextCycleIndex: (begin + attempt + 1) % cycle.length,
        consumedMemories: 0,
      }
    }
  }
  return { row: null, nextCycleIndex: (begin + 1) % cycle.length, consumedMemories: 0 }
}

export function buildFeedLyricsRows(input: {
  lyricPosts: FeedLyricsPostRow[]
  memories: MemoryPublic[]
  peoplePool: FeedLyricsPeopleSlot[]
  signedIn: boolean
  promoAnchor: number
  shortsStripAvailable?: boolean
  memoryCursorStart?: number
}): FeedLyricsRow[] {
  const { lyricPosts, memories, peoplePool, signedIn, promoAnchor } = input
  const shortsStripAvailable = input.shortsStripAvailable !== false
  let memIdx = input.memoryCursorStart ?? 0
  const peopleUsed = new Set<string>()
  const out: FeedLyricsRow[] = []
  let lyricOrdinal = 0
  const nonReplayTotal = lyricPosts.filter((row) => row.kind === 'post' && !row.isReplay).length

  const blockPlan = planFeedBlocks({ nonReplayTotal, signedIn, promoAnchor })
  const { start: startBlocks, after: afterBlocks } = promoInsertsByPlacement(blockPlan)

  const ctxBase = (): BlockCtx => ({
    signedIn,
    memories,
    memIdx,
    peoplePool,
    peopleUsed,
    shortsStripAvailable,
  })

  const emitPlanned = (planned: FeedPlannedBlock) => {
    const result = materializeBlock(planned.kind, cycleFor(signedIn), planned.key, ctxBase())
    memIdx += result.consumedMemories
    if (result.row) out.push(result.row)
  }

  for (const planned of startBlocks) emitPlanned(planned)

  for (const item of lyricPosts) {
    if (item.kind !== 'post') continue
    out.push(item)
    if (item.isReplay) continue
    lyricOrdinal += 1

    const planned = afterBlocks.get(lyricOrdinal)
    if (planned) emitPlanned(planned)
  }

  return out
}

export function simulateFeedBlockPositions(input: {
  lyricPosts: FeedLyricsPostRow[]
  memories: MemoryPublic[]
  peoplePool: FeedLyricsPeopleSlot[]
  signedIn: boolean
  promoAnchor: number
  shortsStripAvailable?: boolean
}): { afterLyric: number; blockKind: string }[] {
  const rows = buildFeedLyricsRows(input)
  let ord = 0
  const table: { afterLyric: number; blockKind: string }[] = []
  for (const r of rows) {
    if (r.kind === 'post' && !r.isReplay) {
      ord += 1
      continue
    }
    if (r.kind === 'post') continue
    const kind =
      r.kind === 'memory-promo'
        ? r.promoKind
        : r.kind === 'shorts-strip'
          ? 'shorts'
          : r.kind === 'memory-carousel'
            ? 'carousel'
            : r.kind
    table.push({ afterLyric: ord, blockKind: kind })
  }
  return table
}
