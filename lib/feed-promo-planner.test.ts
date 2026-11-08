import test from 'node:test'
import assert from 'node:assert/strict'
import { FEED_PROMO_CYCLE, planFeedPromoInserts, feedPromoAnchorIndex } from './feed-promo-planner.ts'

const COUNTS = [0, 3, 8, 20, 40] as const

for (const n of COUNTS) {
  for (const signedIn of [true, false] as const) {
    test(`plan stable for ${signedIn ? 'signed-in' : 'signed-out'} at ${n} posts`, () => {
      const a = planFeedPromoInserts({ nonReplayTotal: n, signedIn, promoAnchor: 0 })
      const b = planFeedPromoInserts({ nonReplayTotal: n, signedIn, promoAnchor: 0 })
      assert.deepEqual(a, b)
    })
  }
}

test('short feed pictures first and shorts after four when signed in', () => {
  const plan = planFeedPromoInserts({ nonReplayTotal: 5, signedIn: true, promoAnchor: 0 })
  assert.equal(plan[0]?.kind, 'pictures')
  assert.equal(plan[0]?.placement, 'start')
  const shorts = plan.find((p) => p.kind === 'shorts')
  assert.ok(shorts && shorts.placement === 'after' && (shorts as { lyricOrdinal: number }).lyricOrdinal >= 4)
})

test('minimum lyric gap between promo inserts for forty posts', () => {
  const plan = planFeedPromoInserts({ nonReplayTotal: 40, signedIn: true, promoAnchor: 0 })
  const ordinals = plan
    .filter((p) => p.placement === 'after')
    .map((p) => (p as { lyricOrdinal: number }).lyricOrdinal)
  for (let i = 1; i < ordinals.length; i++) {
    assert.ok(ordinals[i]! - ordinals[i - 1]! >= 4)
  }
})

test('cycle order respects anchor', () => {
  const plan = planFeedPromoInserts({ nonReplayTotal: 40, signedIn: true, promoAnchor: 1 })
  const kinds = plan.map((p) => p.kind)
  assert.ok(kinds.includes(FEED_PROMO_CYCLE[1]!))
})

test('daily anchor stable', () => {
  assert.equal(feedPromoAnchorIndex('user-a', '2026-11-08'), feedPromoAnchorIndex('user-a', '2026-11-08'))
})

test('forty post planned ordinals logged for docs', () => {
  const plan = planFeedPromoInserts({ nonReplayTotal: 40, signedIn: true, promoAnchor: 0 })
  const ordinals = plan
    .filter((p) => p.placement === 'after')
    .map((p) => ({ ordinal: (p as { lyricOrdinal: number }).lyricOrdinal, kind: p.kind }))
  assert.ok(ordinals.length >= 3)
})
