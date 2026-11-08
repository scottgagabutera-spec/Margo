import test from 'node:test'
import assert from 'node:assert/strict'
import { buildFeedLyricsRows, type FeedLyricsPostRow } from './feed-lyrics-mix.ts'

function lyricPost(id: string): FeedLyricsPostRow {
  return {
    kind: 'post',
    key: id,
    post: { id } as FeedLyricsPostRow['post'],
    sortAt: 1,
    isReplay: false,
  }
}

test('memory card is first when fewer than eight lyric posts', () => {
  const rows = buildFeedLyricsRows({
    lyricPosts: [lyricPost('a'), lyricPost('b')],
    memories: [],
    peoplePool: [],
    showMemoryCards: true,
    memoryCardAnchorIndex: 0,
  })
  assert.equal(rows[0]?.kind, 'memory-card')
})

test('listener and artist get same interleave for identical feed data', () => {
  const posts = Array.from({ length: 6 }, (_, i) => lyricPost(`p${i}`))
  const base = {
    lyricPosts: posts,
    memories: [] as Parameters<typeof buildFeedLyricsRows>[0]['memories'],
    peoplePool: [{ id: 'u1', username: 'u1', displayName: 'U1', avatarUrl: null }],
    showMemoryCards: true,
    memoryCardAnchorIndex: 0,
  }
  const listener = buildFeedLyricsRows(base)
  const artist = buildFeedLyricsRows(base)
  assert.deepEqual(
    listener.map((r) => r.kind),
    artist.map((r) => r.kind),
  )
})

const POST_COUNTS = [0, 3, 8, 20] as const

for (const n of POST_COUNTS) {
  for (const role of ['listener', 'artist'] as const) {
    test(`memory card placement for ${role} with ${n} lyric posts`, () => {
      const posts = Array.from({ length: n }, (_, i) => lyricPost(`p${i}`))
      const rows = buildFeedLyricsRows({
        lyricPosts: posts,
        memories: [],
        peoplePool: [],
        showMemoryCards: true,
        memoryCardAnchorIndex: 0,
      })
      const cards = rows.filter((r) => r.kind === 'memory-card')
      if (n === 0) {
        assert.equal(cards.length, 1)
        return
      }
      assert.ok(cards.length >= 1, `card missing for ${role} n=${n}`)
      if (n < 8) {
        assert.equal(rows[0]?.kind, 'memory-card')
      }
    })
  }
}

test('memory cards still show with five existing memories', () => {
  const posts = Array.from({ length: 4 }, (_, i) => lyricPost(`p${i}`))
  const rows = buildFeedLyricsRows({
    lyricPosts: posts,
    memories: [],
    peoplePool: [],
    showMemoryCards: true,
    memoryCardAnchorIndex: 0,
  })
  assert.equal(rows[0]?.kind, 'memory-card')
})

test('no memory cards when showMemoryCards false', () => {
  const posts = Array.from({ length: 3 }, (_, i) => lyricPost(`p${i}`))
  const rows = buildFeedLyricsRows({
    lyricPosts: posts,
    memories: [],
    peoplePool: [],
    showMemoryCards: false,
    memoryCardAnchorIndex: 0,
  })
  assert.equal(rows.some((r) => r.kind === 'memory-card'), false)
})

test('short feed inserts who to follow after fifth lyric', () => {
  const posts = Array.from({ length: 7 }, (_, i) => lyricPost(`p${i}`))
  const rows = buildFeedLyricsRows({
    lyricPosts: posts,
    memories: [],
    peoplePool: [{ id: 'u1', username: 'one', displayName: 'One', avatarUrl: null }],
    showMemoryCards: true,
    memoryCardAnchorIndex: 0,
  })
  const peopleIdx = rows.findIndex((r) => r.kind === 'people')
  assert.ok(peopleIdx > 0)
  const lyricsBefore = rows.slice(0, peopleIdx).filter((r) => r.kind === 'post').length
  assert.equal(lyricsBefore, 5)
})
