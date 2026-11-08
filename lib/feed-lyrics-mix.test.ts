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

test('two lyric posts have no mix blocks yet', () => {
  const rows = buildFeedLyricsRows({
    lyricPosts: [lyricPost('a'), lyricPost('b')],
    memories: [],
    peoplePool: [{ id: 'u1', username: 'u', displayName: 'U', avatarUrl: null }],
    signedIn: true,
    promoAnchor: 0,
    echoesBlock: mockEchoes,
    shortsStripAvailable: false,
  })
  assert.equal(rows.filter((r) => r.kind !== 'post').length, 0)
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

test('four lyric posts insert memories after third then people', () => {
  const rows = buildFeedLyricsRows({
    lyricPosts: Array.from({ length: 4 }, (_, i) => lyricPost(`p${i}`)),
    memories: [{ id: 'm1' } as never],
    peoplePool: [{ id: 'u1', username: 'u', displayName: 'U', avatarUrl: null }],
    signedIn: false,
    promoAnchor: 0,
    echoesBlock: mockEchoes,
    shortsStripAvailable: false,
  })
  const table = rows
    .map((r) => r.kind)
    .filter((k) => k !== 'post')
  assert.deepEqual(table, ['memories-row', 'people'])
})
