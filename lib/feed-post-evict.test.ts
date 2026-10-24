import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  bindFeedPostsCache,
  evictFeedPostFromCache,
  filterOutDeletedPosts,
  isFeedPostDeleted,
  resetFeedPostEvictForTests,
} from './feed-post-evict.ts'

beforeEach(() => {
  resetFeedPostEvictForTests()
  bindFeedPostsCache({ data: [{ id: 'a' }, { id: 'b' }] as never[], loadedAt: 0, inflight: null })
})

describe('feed post evict', () => {
  it('removes id from cache and suppresses re-add as new moment', () => {
    evictFeedPostFromCache('a')
    assert.equal(isFeedPostDeleted('a'), true)
    const next = filterOutDeletedPosts([{ id: 'a' }, { id: 'b' }])
    assert.deepEqual(next.map((p) => p.id), ['b'])
  })
})
