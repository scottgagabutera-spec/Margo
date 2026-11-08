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

const mockEchoes = {
  setId: 'set',
  questionId: 'q',
  title: 'What are you listening to?',
  answerCount: 2,
  preview: [],
}

test('two lyric posts insert people after first not before', () => {
  const rows = buildFeedLyricsRows({
    lyricPosts: [lyricPost('a'), lyricPost('b')],
    memories: [],
    peoplePool: [{ id: 'u1', username: 'u', displayName: 'U', avatarUrl: null }],
    signedIn: true,
    promoAnchor: 0,
    echoesBlock: mockEchoes,
    shortsStripAvailable: false,
  })
  const firstPostIdx = rows.findIndex((r) => r.kind === 'post')
  const peopleIdx = rows.findIndex((r) => r.kind === 'people')
  assert.ok(firstPostIdx >= 0)
  assert.ok(peopleIdx > firstPostIdx)
})

test('zero lyric posts shows echoes ask when snapshot exists', () => {
  const rows = buildFeedLyricsRows({
    lyricPosts: [],
    memories: [{ id: 'm1' } as never],
    peoplePool: [{ id: 'u1', username: 'u', displayName: 'U', avatarUrl: null }],
    signedIn: true,
    promoAnchor: 0,
    echoesBlock: mockEchoes,
  })
  assert.equal(rows.some((r) => r.kind === 'memories-row'), false)
  assert.equal(rows.some((r) => r.kind === 'echoes-ask'), true)
})

test('signed out short feed has no memory promos', () => {
  const rows = buildFeedLyricsRows({
    lyricPosts: Array.from({ length: 5 }, (_, i) => lyricPost(`p${i}`)),
    memories: [],
    peoplePool: [{ id: 'u1', username: 'u', displayName: 'U', avatarUrl: null }],
    signedIn: false,
    promoAnchor: 0,
    echoesBlock: mockEchoes,
    shortsStripAvailable: false,
  })
  assert.equal(rows.some((r) => r.kind === 'memory-promo'), false)
})
