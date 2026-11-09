import assert from 'node:assert/strict'
import test from 'node:test'
import {
  primaryTabBarRouteActive,
  resolvePrimaryTabBarSelection,
} from './primary-tab-bar-selection.ts'

test('selection prefers painted over route', () => {
  assert.equal(
    resolvePrimaryTabBarSelection({
      hubOpen: false,
      paintedTab: 'discover',
      ackedTab: null,
      routeTab: 'feed',
    }),
    'discover',
  )
})

test('route fallback only when selection is null', () => {
  assert.equal(
    primaryTabBarRouteActive(null, 'feed', '/feed', null),
    true,
  )
  assert.equal(
    primaryTabBarRouteActive('discover', 'feed', '/feed', null),
    false,
  )
})
