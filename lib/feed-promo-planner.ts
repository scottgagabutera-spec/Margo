import { dailyMemoryCardAnchorIndex } from './feed-memory-card.ts'

export type FeedBlockKind =
  | 'memories-row'
  | 'people'
  | 'memory'
  | 'echoes-ask'
  | 'echoes-results'
  | 'pictures'
  | 'shorts'
  | 'story'

/**
 * Lyric-feed mix after the memories row (which is fixed after lyric 3).
 * Order is engagement strategy: graph → easiest create → story → question →
 * full create → shorts → answers, then loop.
 */
export const FEED_BLOCK_CYCLE_SIGNED_IN: FeedBlockKind[] = [
  'people',
  'pictures',
  'story',
  'echoes-ask',
  'memory',
  'shorts',
  'echoes-results',
]

export const FEED_BLOCK_CYCLE_SIGNED_OUT: FeedBlockKind[] = [
  'people',
  'pictures',
  'story',
  'echoes-ask',
  'memory',
  'shorts',
  'echoes-results',
]

/** Shared memories sit after the third lyric, never as the opening block. */
export const FEED_MEMORIES_AFTER_LYRIC = 3

const FIRST_PASS_CYCLE_ORDINALS = [4, 5, 6, 7, 8] as const
const LATE_REPEAT_START = 11
const LATE_REPEAT_STEP = 4

export type FeedPlannedBlock =
  | { placement: 'start'; kind: FeedBlockKind; sequenceStep: number; key: string }
  | { placement: 'after'; lyricOrdinal: number; kind: FeedBlockKind; sequenceStep: number; key: string }

function feedCycle(signedIn: boolean): FeedBlockKind[] {
  return signedIn ? FEED_BLOCK_CYCLE_SIGNED_IN : FEED_BLOCK_CYCLE_SIGNED_OUT
}

export function feedBlockSlots(nonReplayTotal: number): number[] {
  const slots: number[] = []
  for (const o of FIRST_PASS_CYCLE_ORDINALS) {
    if (o <= nonReplayTotal) slots.push(o)
  }
  for (let o = LATE_REPEAT_START; o <= nonReplayTotal; o += LATE_REPEAT_STEP) {
    slots.push(o)
  }
  return slots
}

export function feedPromoAnchorIndex(userId: string | null, dayKey: string, signedIn: boolean): number {
  const cycleLen = feedCycle(signedIn).length
  if (!userId) return 0
  return dailyMemoryCardAnchorIndex(userId, dayKey) % cycleLen
}

export function planFeedBlocks(input: {
  nonReplayTotal: number
  signedIn: boolean
  promoAnchor: number
}): FeedPlannedBlock[] {
  const { nonReplayTotal, signedIn, promoAnchor } = input
  const cycle = feedCycle(signedIn)
  const planned: FeedPlannedBlock[] = []
  let sequenceStep = 0

  const pushStart = (kind: FeedBlockKind) => {
    planned.push({
      placement: 'start',
      kind,
      sequenceStep,
      key: `feed-block-${kind}-${sequenceStep}`,
    })
    sequenceStep += 1
  }

  if (nonReplayTotal === 0) {
    pushStart('echoes-ask')
    return planned
  }

  if (nonReplayTotal >= FEED_MEMORIES_AFTER_LYRIC) {
    planned.push({
      placement: 'after',
      lyricOrdinal: FEED_MEMORIES_AFTER_LYRIC,
      kind: 'memories-row',
      sequenceStep,
      key: `feed-block-memories-row-${sequenceStep}`,
    })
    sequenceStep += 1
  }

  const slots = feedBlockSlots(nonReplayTotal)
  let cycleStep = 0
  for (const lyricOrdinal of slots) {
    const kind = cycle[(promoAnchor + cycleStep) % cycle.length]!
    cycleStep += 1
    planned.push({
      placement: 'after',
      lyricOrdinal,
      kind,
      sequenceStep,
      key: `feed-block-${kind}-${sequenceStep}`,
    })
    sequenceStep += 1
  }

  return planned
}

export function promoInsertsByPlacement(planned: FeedPlannedBlock[]): {
  start: FeedPlannedBlock[]
  after: Map<number, FeedPlannedBlock>
} {
  const start = planned.filter((p) => p.placement === 'start')
  const after = new Map<number, FeedPlannedBlock>()
  for (const p of planned) {
    if (p.placement === 'after') after.set(p.lyricOrdinal, p)
  }
  return { start, after }
}

export function materializeSlotListForPosts(
  postCount: number,
  signedIn: boolean,
  anchor = 0,
): { afterLyric: number; kind: FeedBlockKind }[] {
  const plan = planFeedBlocks({ nonReplayTotal: postCount, signedIn, promoAnchor: anchor })
  const rows: { afterLyric: number; kind: FeedBlockKind }[] = []
  for (const p of plan) {
    if (p.placement === 'start') rows.push({ afterLyric: 0, kind: p.kind })
    else rows.push({ afterLyric: p.lyricOrdinal, kind: p.kind })
  }
  return rows
}
