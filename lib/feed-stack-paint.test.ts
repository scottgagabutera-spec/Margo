import assert from 'node:assert/strict'
import test from 'node:test'
import { feedPrimarySurfaceVisible, resolvePrimaryTabPaint } from './primary-tab-paint.ts'

test('feed stack overlay keeps feed primary surface under profile', () => {
  const state = resolvePrimaryTabPaint({
    pathname: '/profile/alice',
    ownProfileHref: '/profile/me',
    paintedTab: 'feed',
    deepNavHref: null,
    hubRestorePending: false,
    feedStackPinned: true,
  })
  assert.equal(state.feedStackOverlay, true)
  assert.equal(state.activeTab, 'feed')
  assert.equal(state.showAppChildren, true)
  assert.equal(feedPrimarySurfaceVisible(state), true)
  assert.equal(state.visibleSurface, 'feed-stack:/profile/alice')
})

test('direct profile link without pin shows app children only', () => {
  const state = resolvePrimaryTabPaint({
    pathname: '/profile/alice',
    ownProfileHref: null,
    paintedTab: null,
    deepNavHref: null,
    hubRestorePending: false,
    feedStackPinned: false,
  })
  assert.equal(state.feedStackOverlay, false)
  assert.equal(state.activeTab, null)
  assert.equal(state.showAppChildren, true)
  assert.equal(feedPrimarySurfaceVisible(state), false)
})
