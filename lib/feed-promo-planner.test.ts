import test from 'node:test'
import assert from 'node:assert/strict'
import {
  FEED_BLOCK_CYCLE_SIGNED_IN,
  FEED_BLOCK_CYCLE_SIGNED_OUT,
  FEED_MEMORIES_AFTER_LYRIC,
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

test('cycle slots start at 4 then 5-8 then every four from 11', () => {
  assert.deepEqual(feedBlockSlots(20), [4, 5, 6, 7, 8, 11, 15, 19])
})

test('memories row after lyric 3 not at opening', () => {
  const plan = planFeedBlocks({ nonReplayTotal: 20, signedIn: true, promoAnchor: 0 })
  const starts = plan.filter((p) => p.placement === 'start')
  assert.equal(starts.length, 0)
  const memoriesSlot = plan.find((p) => p.kind === 'memories-row')
  assert.equal(memoriesSlot?.placement, 'after')
  assert.equal(memoriesSlot && 'lyricOrdinal' in memoriesSlot ? memoriesSlot.lyricOrdinal : 0, FEED_MEMORIES_AFTER_LYRIC)
})

test('signed in twenty posts mix order', () => {
  const list = materializeSlotListForPosts(20, true, 0)
  const after = list.map((x) => `${x.afterLyric}:${x.kind}`)
  assert.deepEqual(after, [
    '3:memories-row',
    '4:people',
    '5:pictures',
    '6:story',
    '7:echoes-ask',
    '8:memory',
    '11:shorts',
    '15:echoes-results',
    '19:people',
  ])
})

test('signed out still plans create cards', () => {
  const list = materializeSlotListForPosts(20, false, 0)
  assert.ok(list.some((x) => x.kind === 'pictures'))
  assert.ok(list.some((x) => x.kind === 'memory'))
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

test('cycle length seven', () => {
  assert.equal(FEED_BLOCK_CYCLE_SIGNED_IN.length, 7)
  assert.equal(FEED_BLOCK_CYCLE_SIGNED_OUT.length, 7)
})

test('first pass stays pictures then story even when promoAnchor rotates', () => {
  const list = materializeSlotListForPosts(8, true, 3)
  assert.deepEqual(
    list.map((x) => `${x.afterLyric}:${x.kind}`),
    ['3:memories-row', '4:people', '5:pictures', '6:story', '7:echoes-ask', '8:memory'],
  )
})

test('simulate positions include memories at 3 then people', () => {
  const table = simulateFeedBlockPositions({
    lyricPosts: lyricRows(8),
    memories,
    peoplePool,
    signedIn: true,
    promoAnchor: 0,
    shortsStripAvailable: true,
    echoesBlock,
  })
  assert.deepEqual(
    table.map((t) => `${t.afterLyric}:${t.blockKind}`),
    ['3:memories-row', '4:people', '5:pictures', '6:story', '7:echoes-ask', '8:memory'],
  )
})
