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

test('memory nudge is first when fewer than eight lyric posts', () => {
  const rows = buildFeedLyricsRows({
    lyricPosts: [lyricPost('a'), lyricPost('b')],
    memories: [],
    peoplePool: [],
    showMemoryNudge: true,
  })
  assert.equal(rows[0]?.kind, 'memory-nudge')
})

test('memory nudge after eighth post when feed is long enough', () => {
  const posts = Array.from({ length: 10 }, (_, i) => lyricPost(`p${i}`))
  const rows = buildFeedLyricsRows({
    lyricPosts: posts,
    memories: [],
    peoplePool: [],
    showMemoryNudge: true,
  })
  const idx = rows.findIndex((r) => r.kind === 'memory-nudge')
  assert.ok(idx > 0)
  const postsBefore = rows.slice(0, idx).filter((r) => r.kind === 'post' && !r.isReplay).length
  assert.equal(postsBefore, 8)
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
    showMemoryNudge: true,
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
    test(`memory nudge placement matches for ${role} with ${n} lyric posts`, () => {
      const posts = Array.from({ length: n }, (_, i) => lyricPost(`p${i}`))
      const rows = buildFeedLyricsRows({
        lyricPosts: posts,
        memories: [],
        peoplePool: [],
        showMemoryNudge: true,
      })
      const idx = rows.findIndex((r) => r.kind === 'memory-nudge')
      assert.ok(idx >= 0, `nudge missing for ${role} n=${n}`)
      if (n < 8) {
        assert.equal(idx, 0, `nudge must be first when n=${n}`)
      } else {
        const before = rows.slice(0, idx).filter((r) => r.kind === 'post' && !r.isReplay).length
        assert.equal(before, 8)
      }
    })
  }
}

test('no nudge when showMemoryNudge false', () => {
  const posts = Array.from({ length: 3 }, (_, i) => lyricPost(`p${i}`))
  const rows = buildFeedLyricsRows({
    lyricPosts: posts,
    memories: [],
    peoplePool: [],
    showMemoryNudge: false,
  })
  assert.equal(rows.some((r) => r.kind === 'memory-nudge'), false)
})

test('short feed inserts who to follow after fifth lyric', () => {
  const posts = Array.from({ length: 7 }, (_, i) => lyricPost(`p${i}`))
  const rows = buildFeedLyricsRows({
    lyricPosts: posts,
    memories: [],
    peoplePool: [{ id: 'u1', username: 'one', displayName: 'One', avatarUrl: null }],
    showMemoryNudge: true,
  })
  const peopleIdx = rows.findIndex((r) => r.kind === 'people')
  assert.ok(peopleIdx > 0)
  const lyricsBefore = rows.slice(0, peopleIdx).filter((r) => r.kind === 'post').length
  assert.equal(lyricsBefore, 5)
})
