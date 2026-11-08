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

test('slots start at three then step four', () => {
  assert.deepEqual(feedBlockSlots(20), [3, 7, 11, 15, 19])
})

test('signed in twenty posts cycle order anchor zero', () => {
  const plan = planFeedBlocks({ nonReplayTotal: 20, signedIn: true, promoAnchor: 0 })
  const kinds = plan.filter((p) => p.placement === 'after').map((p) => p.kind)
  const expected = feedBlockSlots(20).map((_, i) => FEED_BLOCK_CYCLE_SIGNED_IN[i % FEED_BLOCK_CYCLE_SIGNED_IN.length]!)
  assert.deepEqual(kinds, expected)
})

test('signed out twenty posts cycle order anchor zero', () => {
  const plan = planFeedBlocks({ nonReplayTotal: 20, signedIn: false, promoAnchor: 0 })
  const kinds = plan.filter((p) => p.placement === 'after').map((p) => p.kind)
  const expected = feedBlockSlots(20).map((_, i) => FEED_BLOCK_CYCLE_SIGNED_OUT[i % FEED_BLOCK_CYCLE_SIGNED_OUT.length]!)
  assert.deepEqual(kinds, expected)
})

test('minimum four lyrics between blocks for twenty posts', () => {
  const positions = simulateFeedBlockPositions({
    lyricPosts: lyricRows(20),
    memories,
    peoplePool,
    signedIn: true,
    promoAnchor: 0,
    echoesBlock: {
      setId: 'set',
      questionId: 'q',
      title: 'What are you listening to?',
      answerCount: 1,
      preview: [],
    },
  }).filter((p) => p.afterLyric > 0)
  for (let i = 1; i < positions.length; i++) {
    assert.ok(positions[i]!.afterLyric - positions[i - 1]!.afterLyric >= MIN_LYRICS_BETWEEN_BLOCKS + 1)
  }
})

test('no adjacent blocks', () => {
  const rows = buildFeedLyricsRows({
    lyricPosts: lyricRows(20),
    memories,
    peoplePool,
    signedIn: true,
    promoAnchor: 0,
    echoesBlock: {
      setId: 'set',
      questionId: 'q',
      title: 'What are you listening to?',
      answerCount: 1,
      preview: [],
    },
  })
  let prevBlock = false
  for (const row of rows) {
    const isBlock = row.kind !== 'post'
    if (isBlock && prevBlock) assert.fail('adjacent blocks')
    prevBlock = isBlock
  }
})

test('daily anchor stable', () => {
  assert.equal(
    feedPromoAnchorIndex('user-a', '2026-11-08', true),
    feedPromoAnchorIndex('user-a', '2026-11-08', true),
  )
})
