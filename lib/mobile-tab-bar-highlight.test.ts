import assert from 'node:assert/strict'
import test from 'node:test'
import {
  countMobileTabBarGoldSlots,
  hubTabBarGold,
  primaryTabBarGold,
  primaryTabBarLive,
} from './mobile-tab-bar-highlight.ts'

test('Hub open suppresses primary tab gold', () => {
  assert.equal(primaryTabBarGold(true, true), false)
  assert.equal(primaryTabBarLive(true, true), false)
  assert.equal(hubTabBarGold(true), true)
})

test('Hub closed restores route-active gold only', () => {
  assert.equal(primaryTabBarGold(false, true), true)
  assert.equal(hubTabBarGold(false), false)
})

test('feed+hub cannot both count as gold when hub is open', () => {
  const n = countMobileTabBarGoldSlots({
    hubOpen: true,
    feed: true,
    discover: false,
    signIn: false,
    you: false,
  })
  assert.equal(n, 1)
})

test('rapid hub→feed: only feed gold when hub closed', () => {
  const n = countMobileTabBarGoldSlots({
    hubOpen: false,
    feed: true,
    discover: false,
    signIn: false,
    you: false,
    feedLive: true,
  })
  assert.equal(n, 1)
})
