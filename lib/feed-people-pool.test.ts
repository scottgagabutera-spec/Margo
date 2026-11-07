import test from 'node:test'
import assert from 'node:assert/strict'
import { buildFeedPeoplePool } from './feed-people-pool.ts'

test('people pool excludes self and already followed', () => {
  const pool = buildFeedPeoplePool({
    fromPosts: [
      { id: 'a', username: 'a', displayName: 'A', avatarUrl: null },
      { id: 'b', username: 'b', displayName: 'B', avatarUrl: null },
    ],
    suggestions: [{ id: 'c', username: 'c', displayName: 'C', avatarUrl: null }],
    myId: 'me',
    followingIds: new Set(['b']),
  })
  const ids = pool.map((p) => p.id)
  assert.deepEqual(ids, ['a', 'c'])
})
