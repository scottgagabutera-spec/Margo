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
