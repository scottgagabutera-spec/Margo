import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildFeedResumeHref,
  mergeFeedReturnSnapshot,
  shouldRestoreFeedTabOnNav,
} from './margo-feed-return.ts'

test('forward tab taps are never bounced to the saved tab', () => {
  assert.equal(shouldRestoreFeedTabOnNav({ restored: true, viaPop: false }), false)
  assert.equal(shouldRestoreFeedTabOnNav({ restored: true, viaPop: true }), true)
  assert.equal(shouldRestoreFeedTabOnNav({ restored: false, viaPop: false }), true)
})

test('buildFeedResumeHref lyrics tab', () => {
  assert.equal(buildFeedResumeHref({ tab: 'lyrics' }), '/feed')
})

test('buildFeedResumeHref shorts with index', () => {
  assert.equal(buildFeedResumeHref({ tab: 'shorts', shortsAt: 4 }), '/feed?tab=shorts&shortsAt=4')
})

test('mergeFeedReturnSnapshot prefers live dom horizontal scroll', () => {
  const merged = mergeFeedReturnSnapshot(
    { tab: 'lyrics', y: 10, at: 1, memoriesRowX: 5, shortsStripX: 0, shortsAt: null, href: '/feed' },
    { tab: 'lyrics', memoriesRowX: 120, shortsStripX: 40, shortsAt: null, href: '/feed' },
    880,
    'post-1',
  )
  assert.equal(merged.y, 880)
  assert.equal(merged.memoriesRowX, 120)
  assert.equal(merged.shortsStripX, 40)
  assert.equal(merged.href, '/feed')
  assert.equal(merged.anchorId, 'post-1')
})
