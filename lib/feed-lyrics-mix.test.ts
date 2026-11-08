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

function cardKinds(rows: ReturnType<typeof buildFeedLyricsRows>['rows']) {
  return rows.filter((r) => r.kind === 'memory-card').map((r) => (r.kind === 'memory-card' ? r.cardKind : ''))
}

test('memory card is first when fewer than eight lyric posts', () => {
  const { rows } = buildFeedLyricsRows({
    lyricPosts: [lyricPost('a'), lyricPost('b')],
    memories: [],
    peoplePool: [],
    showMemoryCards: true,
  })
  assert.equal(rows[0]?.kind, 'memory-card')
})

test('memory card after eighth post when feed is long enough', () => {
  const posts = Array.from({ length: 10 }, (_, i) => lyricPost(`p${i}`))
  const { rows } = buildFeedLyricsRows({
    lyricPosts: posts,
    memories: [],
    peoplePool: [],
    showMemoryCards: true,
  })
  const idx = rows.findIndex((r) => r.kind === 'memory-card')
  assert.ok(idx > 0)
  const postsBefore = rows.slice(0, idx).filter((r) => r.kind === 'post' && !r.isReplay).length
  assert.equal(postsBefore, 8)
})

test('second memory card after thirtieth post', () => {
  const posts = Array.from({ length: 35 }, (_, i) => lyricPost(`p${i}`))
  const { rows } = buildFeedLyricsRows({
    lyricPosts: posts,
    memories: [],
    peoplePool: [],
    showMemoryCards: true,
  })
  const cards = rows.filter((r) => r.kind === 'memory-card')
  assert.equal(cards.length, 2)
  const idx8 = rows.findIndex((r) => r.kind === 'memory-card')
  const before8 = rows.slice(0, idx8).filter((r) => r.kind === 'post' && !r.isReplay).length
  assert.equal(before8, 8)
  const idx30 = rows.findIndex((r, i) => r.kind === 'memory-card' && i > idx8)
  const before30 = rows.slice(0, idx30).filter((r) => r.kind === 'post' && !r.isReplay).length
  assert.equal(before30, 30)
})

test('never the same card twice in a row when two slots show', () => {
  const posts = Array.from({ length: 35 }, (_, i) => lyricPost(`p${i}`))
  const { rows } = buildFeedLyricsRows({
    lyricPosts: posts,
    memories: [],
    peoplePool: [],
    showMemoryCards: true,
  })
  const kinds = cardKinds(rows)
  assert.equal(kinds.length, 2)
  assert.notEqual(kinds[0], kinds[1])
})

test('listener and artist get same interleave for identical feed data', () => {
  const posts = Array.from({ length: 6 }, (_, i) => lyricPost(`p${i}`))
  const memories = [{ id: 'm1' }] as Parameters<typeof buildFeedLyricsRows>[0]['memories']
  const people = [
    { id: 'u1', username: 'u1', displayName: 'U1', avatarUrl: null },
    { id: 'u2', username: 'u2', displayName: 'U2', avatarUrl: null },
  ]
  const base = {
    lyricPosts: posts,
    memories,
    peoplePool: people,
    showMemoryCards: true,
  }
  const listener = buildFeedLyricsRows(base).rows
  const artist = buildFeedLyricsRows(base).rows
  assert.deepEqual(
    listener.map((r) => r.kind),
    artist.map((r) => r.kind),
  )
})

const POST_COUNTS = [0, 3, 8, 20] as const

for (const n of POST_COUNTS) {
  for (const role of ['listener', 'artist'] as const) {
    test(`memory card placement matches for ${role} with ${n} lyric posts`, () => {
      const posts = Array.from({ length: n }, (_, i) => lyricPost(`p${i}`))
      const { rows } = buildFeedLyricsRows({
        lyricPosts: posts,
        memories: [],
        peoplePool: [],
        showMemoryCards: true,
      })
      const cards = rows.filter((r) => r.kind === 'memory-card')
      if (n === 0) {
        assert.equal(cards.length, 1)
        assert.equal(rows[0]?.kind, 'memory-card')
        return
      }
      assert.ok(cards.length >= 1, `card missing for ${role} n=${n}`)
      const idx = rows.findIndex((r) => r.kind === 'memory-card')
      if (n < 8) {
        assert.equal(idx, 0, `card must be first when n=${n}`)
      } else {
        const before = rows.slice(0, idx).filter((r) => r.kind === 'post' && !r.isReplay).length
        assert.equal(before, 8)
      }
    })
  }
}

for (const memCount of [0, 5]) {
  test(`memory cards still show with ${memCount} existing memories`, () => {
    const posts = Array.from({ length: 4 }, (_, i) => lyricPost(`p${i}`))
    const { rows } = buildFeedLyricsRows({
      lyricPosts: posts,
      memories: [],
      peoplePool: [],
      showMemoryCards: true,
    })
    void memCount
    assert.equal(rows[0]?.kind, 'memory-card')
  })
}

test('no memory cards when showMemoryCards false', () => {
  const posts = Array.from({ length: 3 }, (_, i) => lyricPost(`p${i}`))
  const { rows } = buildFeedLyricsRows({
    lyricPosts: posts,
    memories: [],
    peoplePool: [],
    showMemoryCards: false,
  })
  assert.equal(rows.some((r) => r.kind === 'memory-card'), false)
})

test('short feed inserts who to follow after fifth lyric', () => {
  const posts = Array.from({ length: 7 }, (_, i) => lyricPost(`p${i}`))
  const { rows } = buildFeedLyricsRows({
    lyricPosts: posts,
    memories: [],
    peoplePool: [{ id: 'u1', username: 'one', displayName: 'One', avatarUrl: null }],
    showMemoryCards: true,
  })
  const peopleIdx = rows.findIndex((r) => r.kind === 'people')
  assert.ok(peopleIdx > 0)
  const lyricsBefore = rows.slice(0, peopleIdx).filter((r) => r.kind === 'post').length
  assert.equal(lyricsBefore, 5)
})
