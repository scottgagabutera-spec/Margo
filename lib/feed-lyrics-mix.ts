import type { MemoryPublic } from '@/lib/memory/types'
import type { Post } from '@/hooks/usePosts'
import type { MemoryPromoKind } from './feed-memory-card.ts'
import type { EchoFeedBlockSnapshot } from './echoes/types.ts'
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
  | { kind: 'memories-row'; key: string; memories: MemoryPublic[]; hasMore: boolean; planKey: string }
  | { kind: 'echoes-set'; key: string; block: EchoFeedBlockSnapshot; planKey: string }
  | { kind: 'people'; key: string; people: FeedLyricsPeopleSlot[]; planKey: string }
  | { kind: 'memory-promo'; key: string; promoKind: MemoryPromoKind; planKey: string }
  | { kind: 'shorts-strip'; key: string; planKey: string }

export const FEED_LYRICS_MEMORY_ROW_SIZE = 8

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
  echoesBlock: EchoFeedBlockSnapshot | null
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
    case 'memories-row':
      return ctx.memories.length > ctx.memIdx
    case 'people':
      return peekPeople(ctx.peoplePool, ctx.peopleUsed).length > 0
    case 'shorts':
      return ctx.shortsStripAvailable
    case 'echoes':
      return ctx.echoesBlock != null
    default:
      return false
  }
}

type MaterializeResult = { row: FeedLyricsRow | null; consumedMemories: number }

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
        return { row: { kind: 'people', key, people, planKey: key }, consumedMemories: 0 }
      }
    }
    if (kind === 'shorts') {
      return { row: { kind: 'shorts-strip', key, planKey: key }, consumedMemories: 0 }
    }
    if (kind === 'echoes' && ctx.echoesBlock) {
      return {
        row: { kind: 'echoes-set', key, block: ctx.echoesBlock, planKey: key },
        consumedMemories: 0,
      }
    }
    if (kind === 'memories-row') {
      const chunk = ctx.memories.slice(ctx.memIdx, ctx.memIdx + FEED_LYRICS_MEMORY_ROW_SIZE)
      if (chunk.length > 0) {
        const hasMore = ctx.memIdx + chunk.length < ctx.memories.length
        return {
          row: { kind: 'memories-row', key, memories: chunk, hasMore, planKey: key },
          consumedMemories: chunk.length,
        }
      }
    }
    const promoKind = promoToMemoryKind(kind)
    if (promoKind) {
      return { row: { kind: 'memory-promo', key, promoKind, planKey: key }, consumedMemories: 0 }
    }
  }
  return { row: null, consumedMemories: 0 }
}

export function buildFeedLyricsRows(input: {
  lyricPosts: FeedLyricsPostRow[]
  memories: MemoryPublic[]
  peoplePool: FeedLyricsPeopleSlot[]
  signedIn: boolean
  promoAnchor: number
  shortsStripAvailable?: boolean
  echoesBlock?: EchoFeedBlockSnapshot | null
  memoryCursorStart?: number
}): FeedLyricsRow[] {
  const { lyricPosts, memories, peoplePool, signedIn, promoAnchor } = input
  const shortsStripAvailable = input.shortsStripAvailable !== false
  const echoesBlock = input.echoesBlock ?? null
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
    echoesBlock,
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
  echoesBlock?: EchoFeedBlockSnapshot | null
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
          : r.kind === 'memories-row'
            ? 'memories-row'
            : r.kind === 'echoes-set'
              ? 'echoes'
              : r.kind
    table.push({ afterLyric: ord, blockKind: kind })
  }
  return table
}
