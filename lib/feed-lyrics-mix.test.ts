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

test('short feed starts with pictures for signed in user', () => {
  const rows = buildFeedLyricsRows({
    lyricPosts: [lyricPost('a'), lyricPost('b')],
    memories: [],
    peoplePool: [{ id: 'u1', username: 'u', displayName: 'U', avatarUrl: null }],
    signedIn: true,
    promoAnchor: 0,
  })
  assert.equal(rows[0]?.kind, 'memory-promo')
  if (rows[0]?.kind === 'memory-promo') assert.equal(rows[0].promoKind, 'pictures')
})

test('zero lyric posts still shows signed in lead blocks', () => {
  const rows = buildFeedLyricsRows({
    lyricPosts: [],
    memories: [{ id: 'm1' } as never],
    peoplePool: [{ id: 'u1', username: 'u', displayName: 'U', avatarUrl: null }],
    signedIn: true,
    promoAnchor: 0,
  })
  assert.equal(rows.some((r) => r.kind === 'memories-row'), true)
  assert.equal(rows.some((r) => r.kind === 'listening-prompt'), true)
})

test('signed out short feed has no memory promos', () => {
  const rows = buildFeedLyricsRows({
    lyricPosts: Array.from({ length: 5 }, (_, i) => lyricPost(`p${i}`)),
    memories: [],
    peoplePool: [{ id: 'u1', username: 'u', displayName: 'U', avatarUrl: null }],
    signedIn: false,
    promoAnchor: 0,
  })
  assert.equal(rows.some((r) => r.kind === 'memory-promo'), false)
})
