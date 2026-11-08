import test from 'node:test'
import assert from 'node:assert/strict'
import {
  FEED_BLOCK_CYCLE_SIGNED_IN,
  FEED_BLOCK_CYCLE_SIGNED_OUT,
  feedBlockSlots,
  materializeSlotListForPosts,
  planFeedBlocks,
} from './feed-promo-planner.ts'
import { buildFeedLyricsRows, simulateFeedBlockPositions, type FeedLyricsPostRow } from './feed-lyrics-mix.ts'

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
const echoesBlock = {
  setId: 'set',
  questionId: 'q',
  title: 'What are you listening to?',
  answerCount: 2,
  preview: [],
}

test('slots after lyrics 1 through 7 then every four from 11', () => {
  assert.deepEqual(feedBlockSlots(20), [1, 2, 3, 4, 5, 6, 7, 11, 15, 19])
})

test('signed in twenty posts slot list anchor zero', () => {
  const list = materializeSlotListForPosts(20, true, 0)
  const kinds = list.map((x) => x.kind)
  assert.equal(kinds[0], 'memories-row')
  const after = list.filter((x) => x.afterLyric > 0).map((x) => `${x.afterLyric}:${x.kind}`)
  assert.deepEqual(after, [
    '1:people',
    '2:shorts',
    '3:echoes-ask',
    '4:memory',
    '5:echoes-results',
    '6:story',
    '7:pictures',
    '11:people',
    '15:shorts',
    '19:echoes-ask',
  ])
})

test('signed out twenty posts omits memory create', () => {
  const list = materializeSlotListForPosts(20, false, 0)
  const kinds = list.map((x) => x.kind)
  assert.ok(!kinds.includes('memory'))
  assert.deepEqual(kinds.filter((k) => k === 'echoes-ask').length, 2)
})

test('memories row at start only', () => {
  const plan = planFeedBlocks({ nonReplayTotal: 20, signedIn: true, promoAnchor: 0 })
  const starts = plan.filter((p) => p.placement === 'start')
  assert.equal(starts.length, 1)
  assert.equal(starts[0]!.kind, 'memories-row')
})

test('no adjacent blocks in mix', () => {
  const rows = buildFeedLyricsRows({
    lyricPosts: lyricRows(20),
    memories,
    peoplePool,
    signedIn: true,
    promoAnchor: 0,
    shortsStripAvailable: true,
    echoesBlock,
  })
  let prevBlock = false
  for (const row of rows) {
    const isBlock = row.kind !== 'post'
    if (isBlock && prevBlock) assert.fail('adjacent blocks')
    prevBlock = isBlock
  }
})

test('cycle length seven signed in', () => {
  assert.equal(FEED_BLOCK_CYCLE_SIGNED_IN.length, 7)
  assert.equal(FEED_BLOCK_CYCLE_SIGNED_OUT.length, 6)
})

test('simulate positions echoes split', () => {
  const table = simulateFeedBlockPositions({
    lyricPosts: lyricRows(8),
    memories,
    peoplePool,
    signedIn: true,
    promoAnchor: 0,
    shortsStripAvailable: true,
    echoesBlock,
  })
  assert.ok(table.some((t) => t.blockKind === 'echoes-ask'))
  assert.ok(table.some((t) => t.blockKind === 'echoes-results'))
})
