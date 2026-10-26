import assert from 'node:assert/strict'
import test from 'node:test'
import {
  feedPrimarySurfaceVisible,
  resolvePrimaryTabPaint,
  simulateHubTileNavSequence,
} from './primary-tab-paint.ts'

const tiles = [
  { href: '/messages', id: 'messages' },
  { href: '/notifications', id: 'notifications' },
  { href: '/library', id: 'library' },
] as const

for (const tile of tiles) {
  for (const widthLabel of ['phone', 'laptop'] as const) {
    test(`A1 hub ${tile.id} tap @${widthLabel}: feed keepalive never visible during deep nav`, () => {
      const { afterTap } = simulateHubTileNavSequence({
        startPath: '/feed',
        tileHref: tile.href,
        pathnameAfterTap: '/feed',
      })
      assert.equal(feedPrimarySurfaceVisible(afterTap), false)
      assert.equal(afterTap.showDeepNavSkeleton, true)
      assert.equal(afterTap.visibleSurface, tile.href)
    })
  }
}

test('A1 after route commits, deep skeleton clears and app children show', () => {
  const committed = resolvePrimaryTabPaint({
    pathname: '/messages',
    ownProfileHref: null,
    paintedTab: null,
    deepNavHref: '/messages',
    hubRestorePending: false,
  })
  assert.equal(committed.showDeepNavSkeleton, false)
  assert.equal(committed.showAppChildren, true)
  assert.equal(feedPrimarySurfaceVisible(committed), false)
})

test('A1 back to hub restore hides feed keepalive until overlay opens', () => {
  const state = resolvePrimaryTabPaint({
    pathname: '/feed',
    ownProfileHref: null,
    paintedTab: null,
    deepNavHref: null,
    hubRestorePending: true,
  })
  assert.equal(feedPrimarySurfaceVisible(state), false)
})
