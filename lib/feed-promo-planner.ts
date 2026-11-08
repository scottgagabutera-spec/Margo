import { dailyMemoryCardAnchorIndex } from './feed-memory-card.ts'

export type FeedBlockKind =
  | 'memories-row'
  | 'people'
  | 'memory'
  | 'echoes'
  | 'pictures'
  | 'shorts'
  | 'story'

export const FEED_BLOCK_CYCLE_SIGNED_IN: FeedBlockKind[] = [
  'memories-row',
  'people',
  'memory',
  'echoes',
  'story',
  'pictures',
  'shorts',
]

export const FEED_BLOCK_CYCLE_SIGNED_OUT: FeedBlockKind[] = [
  'memories-row',
  'people',
  'echoes',
  'story',
  'pictures',
  'shorts',
]

const EARLY_BLOCK_ORDINALS = [3, 6, 9, 12, 15] as const
const LATE_BLOCK_STEP = 4
const LATE_BLOCK_START = 19
const SHORT_FEED_MAX = 5
/** Lyric posts between consecutive block slots (first at 3, then every 4 ordinals). */
export const MIN_LYRICS_BETWEEN_BLOCKS = 3

export type FeedPlannedBlock =
  | { placement: 'start'; kind: FeedBlockKind; sequenceStep: number; key: string }
  | { placement: 'after'; lyricOrdinal: number; kind: FeedBlockKind; sequenceStep: number; key: string }

function feedCycle(signedIn: boolean): FeedBlockKind[] {
  return signedIn ? FEED_BLOCK_CYCLE_SIGNED_IN : FEED_BLOCK_CYCLE_SIGNED_OUT
}

export function feedBlockSlots(nonReplayTotal: number): number[] {
  const slots: number[] = []
  for (const o of EARLY_BLOCK_ORDINALS) {
    if (o <= nonReplayTotal) slots.push(o)
  }
  for (let o = LATE_BLOCK_START; o <= nonReplayTotal; o += LATE_BLOCK_STEP) {
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
    pushStart('echoes')
    return planned
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
