import assert from 'node:assert/strict'
import test from 'node:test'
import {
  primaryTabBarRouteActive,
  resolvePrimaryTabBarSelection,
} from './primary-tab-bar-selection.ts'

test('bar selection prefers painted then acked over route', () => {
  assert.equal(
    resolvePrimaryTabBarSelection({
      hubOpen: false,
      paintedTab: 'feed',
      ackedTab: 'discover',
      routeTab: 'discover',
    }),
    'feed',
  )
  assert.equal(
    resolvePrimaryTabBarSelection({
      hubOpen: false,
      paintedTab: null,
      ackedTab: 'feed',
      routeTab: null,
    }),
    'feed',
  )
})

test('feed tap on /signin: acked feed wins over signin pathname', () => {
  const sel = resolvePrimaryTabBarSelection({
    hubOpen: false,
    paintedTab: 'feed',
    ackedTab: 'feed',
    routeTab: null,
  })
  assert.equal(primaryTabBarRouteActive(sel, 'feed', '/signin'), true)
  assert.equal(primaryTabBarRouteActive(sel, 'discover', '/signin'), false)
})
