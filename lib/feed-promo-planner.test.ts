import test from 'node:test'
import assert from 'node:assert/strict'
import {
  FEED_BLOCK_CYCLE_SIGNED_IN,
  FEED_BLOCK_CYCLE_SIGNED_OUT,
  MIN_LYRICS_BETWEEN_BLOCKS,
  feedBlockSlots,
  feedPromoAnchorIndex,
  planFeedBlocks,
} from './feed-promo-planner.ts'
import { buildFeedLyricsRows, simulateFeedBlockPositions, type FeedLyricsPostRow } from './feed-lyrics-mix.ts'

const COUNTS = [0, 3, 8, 20, 40] as const
const ROLES = ['listener', 'artist'] as const

function lyricRows(n: number): FeedLyricsPostRow[] {
  return Array.from({ length: n }, (_, i) => ({
    kind: 'post',
    key: `p${i}`,
    post: { id: `p${i}` } as FeedLyricsPostRow['post'],
    sortAt: 1,
    isReplay: false,
  }))
}

const peoplePool = [{ id: 'u1', username: 'a', displayName: 'A', avatarUrl: null }]
const memories = Array.from({ length: 30 }, (_, i) => ({ id: `m${i}` }))

for (const n of COUNTS) {
  for (const signedIn of [true, false] as const) {
    for (const role of ROLES) {
      test(`plan stable ${role} ${signedIn ? 'signed-in' : 'signed-out'} at ${n} posts`, () => {
        void role
        const a = planFeedBlocks({ nonReplayTotal: n, signedIn, promoAnchor: 0 })
        const b = planFeedBlocks({ nonReplayTotal: n, signedIn, promoAnchor: 0 })
        assert.deepEqual(a, b)
      })
    }
  }
}

test('zero posts signed in starts pictures and shorts', () => {
  const plan = planFeedBlocks({ nonReplayTotal: 0, signedIn: true, promoAnchor: 0 })
  assert.deepEqual(
    plan.map((p) => p.kind),
    ['pictures', 'shorts'],
  )
})

test('zero posts signed out starts shorts only', () => {
  const plan = planFeedBlocks({ nonReplayTotal: 0, signedIn: false, promoAnchor: 0 })
  assert.deepEqual(plan.map((p) => p.kind), ['shorts'])
})

test('short feed signed in starts with pictures', () => {
  const plan = planFeedBlocks({ nonReplayTotal: 3, signedIn: true, promoAnchor: 0 })
  assert.equal(plan[0]?.placement, 'start')
  assert.equal(plan[0]?.kind, 'pictures')
})

test('slots every six lyrics starting at five', () => {
  assert.deepEqual(feedBlockSlots(40), [5, 11, 17, 23, 29, 35])
})

test('minimum five lyrics between block ordinals for forty posts', () => {
  const positions = simulateFeedBlockPositions({
    lyricPosts: lyricRows(40),
    memories,
    peoplePool,
    signedIn: true,
    promoAnchor: 0,
  }).filter((p) => p.afterLyric > 0)
  for (let i = 1; i < positions.length; i++) {
    assert.ok(positions[i]!.afterLyric - positions[i - 1]!.afterLyric >= MIN_LYRICS_BETWEEN_BLOCKS + 1)
  }
})

test('no adjacent blocks in built feed', () => {
  const rows = buildFeedLyricsRows({
    lyricPosts: lyricRows(40),
    memories,
    peoplePool,
    signedIn: true,
    promoAnchor: 0,
  })
  let prevBlock = false
  for (const row of rows) {
    const isBlock = row.kind !== 'post'
    if (isBlock && prevBlock) assert.fail('two blocks side by side')
    prevBlock = isBlock
  }
})

test('signed in forty posts cycle order at anchor zero', () => {
  const plan = planFeedBlocks({ nonReplayTotal: 40, signedIn: true, promoAnchor: 0 })
  const afterKinds = plan.filter((p) => p.placement === 'after').map((p) => p.kind)
  const expected = feedBlockSlots(40).map((_, i) => FEED_BLOCK_CYCLE_SIGNED_IN[i % FEED_BLOCK_CYCLE_SIGNED_IN.length]!)
  assert.deepEqual(afterKinds, expected)
})

test('signed out forty posts cycle order at anchor zero', () => {
  const plan = planFeedBlocks({ nonReplayTotal: 40, signedIn: false, promoAnchor: 0 })
  const afterKinds = plan.filter((p) => p.placement === 'after').map((p) => p.kind)
  const expected = feedBlockSlots(40).map((_, i) => FEED_BLOCK_CYCLE_SIGNED_OUT[i % FEED_BLOCK_CYCLE_SIGNED_OUT.length]!)
  assert.deepEqual(afterKinds, expected)
})

test('skipping empty carousel does not create adjacent blocks', () => {
  const rows = buildFeedLyricsRows({
    lyricPosts: lyricRows(20),
    memories: [],
    peoplePool,
    signedIn: true,
    promoAnchor: 0,
  })
  let prevBlock = false
  for (const row of rows) {
    const isBlock = row.kind !== 'post'
    if (isBlock && prevBlock) assert.fail('collision after skip')
    prevBlock = isBlock
  }
  assert.ok(rows.some((r) => r.kind === 'people'))
})

test('daily anchor stable', () => {
  assert.equal(
    feedPromoAnchorIndex('user-a', '2026-11-08', true),
    feedPromoAnchorIndex('user-a', '2026-11-08', true),
  )
})
