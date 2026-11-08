import { dailyMemoryCardAnchorIndex } from './feed-memory-card.ts'

export type FeedPromoKind = 'pictures' | 'people' | 'story' | 'shorts' | 'memory'

export const FEED_PROMO_CYCLE: FeedPromoKind[] = ['pictures', 'people', 'story', 'shorts', 'memory']

const MIN_LYRIC_GAP = 3
const TARGET_GAP = 5
const CAROUSEL_EVERY = 6
const SHORT_FEED_PROMO_MAX = 8
const SHORTS_AFTER_LYRIC = 4

export type FeedPlannedInsert =
  | { placement: 'start'; kind: FeedPromoKind; sequenceStep: number; key: string }
  | { placement: 'after'; lyricOrdinal: number; kind: FeedPromoKind; sequenceStep: number; key: string }

export type FeedCarouselSlot = { lyricOrdinal: number; key: string }

function carouselOrdinals(nonReplayTotal: number): number[] {
  const out: number[] = []
  for (let o = CAROUSEL_EVERY; o <= nonReplayTotal; o += CAROUSEL_EVERY) out.push(o)
  return out
}

function isSignedInOnly(kind: FeedPromoKind): boolean {
  return kind === 'pictures' || kind === 'story' || kind === 'memory'
}

/** Blocks where a promo must not land (carousel neighbors and carousel rows). */
function blockedPromoOrdinals(nonReplayTotal: number): Set<number> {
  const blocked = new Set<number>()
  for (let c = CAROUSEL_EVERY; c <= nonReplayTotal; c += CAROUSEL_EVERY) {
    for (let d = 0; d <= MIN_LYRIC_GAP; d += 1) {
      const o = c - d
      if (o >= 1) blocked.add(o)
    }
    blocked.add(c)
  }
  return blocked
}

function gapOk(lastOrdinal: number, candidate: number): boolean {
  if (lastOrdinal <= 0) return true
  return candidate - lastOrdinal >= MIN_LYRIC_GAP + 1
}

function notAdjacentToPlanned(candidate: number, plannedOrdinals: number[]): boolean {
  return plannedOrdinals.every((p) => Math.abs(p - candidate) >= MIN_LYRIC_GAP + 1)
}

function findOrdinal(
  from: number,
  nonReplayTotal: number,
  blocked: Set<number>,
  plannedOrdinals: number[],
  lastOrdinal: number,
): number | null {
  for (let o = from; o <= nonReplayTotal; o++) {
    if (blocked.has(o)) continue
    if (!gapOk(lastOrdinal, o)) continue
    if (!notAdjacentToPlanned(o, plannedOrdinals)) continue
    return o
  }
  return null
}

export function feedPromoAnchorIndex(userId: string | null, dayKey: string): number {
  if (!userId) return 0
  return dailyMemoryCardAnchorIndex(userId, dayKey)
}

export function planFeedPromoInserts(input: {
  nonReplayTotal: number
  signedIn: boolean
  promoAnchor: number
}): FeedPlannedInsert[] {
  const { nonReplayTotal, signedIn, promoAnchor } = input
  if (nonReplayTotal <= 0) return []

  const blocked = blockedPromoOrdinals(nonReplayTotal)
  const planned: FeedPlannedInsert[] = []
  const plannedOrdinals: number[] = []
  let lastOrdinal = 0
  let sequenceStep = 0

  const pushAfter = (kind: FeedPromoKind, ordinal: number) => {
    planned.push({
      placement: 'after',
      lyricOrdinal: ordinal,
      kind,
      sequenceStep,
      key: `feed-promo-${kind}-${sequenceStep}`,
    })
    plannedOrdinals.push(ordinal)
    lastOrdinal = ordinal
    sequenceStep += 1
  }

  if (nonReplayTotal < SHORT_FEED_PROMO_MAX) {
    if (signedIn) {
      planned.push({
        placement: 'start',
        kind: 'pictures',
        sequenceStep,
        key: `feed-promo-pictures-${sequenceStep}`,
      })
      sequenceStep += 1
    }
    if (nonReplayTotal >= SHORTS_AFTER_LYRIC) {
      const o = findOrdinal(SHORTS_AFTER_LYRIC, nonReplayTotal, blocked, plannedOrdinals, lastOrdinal)
      if (o !== null) pushAfter('shorts', o)
    }
    return planned
  }

  let cycleStep = 0
  let nextTarget = TARGET_GAP

  while (cycleStep < 200) {
    const kind = FEED_PROMO_CYCLE[(promoAnchor + cycleStep) % FEED_PROMO_CYCLE.length]!
    cycleStep += 1
    if (!signedIn && isSignedInOnly(kind)) continue

    const from = Math.max(nextTarget, lastOrdinal > 0 ? lastOrdinal + MIN_LYRIC_GAP + 1 : TARGET_GAP)
    const ordinal = findOrdinal(from, nonReplayTotal, blocked, plannedOrdinals, lastOrdinal)
    if (ordinal === null) break
    pushAfter(kind, ordinal)
    nextTarget = ordinal + TARGET_GAP
    if (ordinal >= nonReplayTotal) break
  }

  return planned
}

export function planFeedCarouselSlots(nonReplayTotal: number): FeedCarouselSlot[] {
  return carouselOrdinals(nonReplayTotal).map((lyricOrdinal) => ({
    lyricOrdinal,
    key: `memory-carousel-slot-${lyricOrdinal}`,
  }))
}

export function promoInsertsByPlacement(planned: FeedPlannedInsert[]): {
  start: FeedPlannedInsert[]
  after: Map<number, FeedPlannedInsert>
} {
  const start = planned.filter((p) => p.placement === 'start')
  const after = new Map<number, FeedPlannedInsert>()
  for (const p of planned) {
    if (p.placement === 'after') after.set(p.lyricOrdinal, p)
  }
  return { start, after }
}
