import { dailyMemoryCardAnchorIndex } from './feed-memory-card.ts'

export type FeedBlockKind = 'pictures' | 'carousel' | 'people' | 'story' | 'shorts' | 'memory'

export const FEED_BLOCK_CYCLE_SIGNED_IN: FeedBlockKind[] = [
  'pictures',
  'carousel',
  'people',
  'story',
  'carousel',
  'shorts',
  'memory',
  'carousel',
]

export const FEED_BLOCK_CYCLE_SIGNED_OUT: FeedBlockKind[] = ['carousel', 'people', 'shorts']

const SLOT_FIRST_ORDINAL = 5
const SLOT_STEP = 6
const SHORT_FEED_MAX = 5
export const MIN_LYRICS_BETWEEN_BLOCKS = 5

export type FeedPlannedBlock =
  | { placement: 'start'; kind: FeedBlockKind; sequenceStep: number; key: string }
  | { placement: 'after'; lyricOrdinal: number; kind: FeedBlockKind; sequenceStep: number; key: string }

function feedCycle(signedIn: boolean): FeedBlockKind[] {
  return signedIn ? FEED_BLOCK_CYCLE_SIGNED_IN : FEED_BLOCK_CYCLE_SIGNED_OUT
}

export function feedBlockSlots(nonReplayTotal: number): number[] {
  const slots: number[] = []
  for (let o = SLOT_FIRST_ORDINAL; o <= nonReplayTotal; o += SLOT_STEP) slots.push(o)
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
    if (signedIn) {
      pushStart('pictures')
      pushStart('shorts')
    } else {
      pushStart('shorts')
    }
    return planned
  }

  if (signedIn && nonReplayTotal < SHORT_FEED_MAX) {
    pushStart('pictures')
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

/** @deprecated use planFeedBlocks */
export type FeedPromoKind = 'pictures' | 'people' | 'story' | 'shorts' | 'memory'
export const FEED_PROMO_CYCLE: FeedPromoKind[] = ['pictures', 'people', 'story', 'shorts', 'memory']

export type FeedPlannedInsert = FeedPlannedBlock

export function planFeedPromoInserts(input: {
  nonReplayTotal: number
  signedIn: boolean
  promoAnchor: number
}): FeedPlannedBlock[] {
  return planFeedBlocks(input)
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
