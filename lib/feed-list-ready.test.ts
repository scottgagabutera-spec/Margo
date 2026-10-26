import assert from 'node:assert/strict'
import test from 'node:test'
import { canMountYouKeepalivePane, feedListReady } from './feed-list-ready.ts'

test('feed renders empty state when seeded and not loading', () => {
  assert.equal(feedListReady(true, 0, false), true)
})

test('feed waits while loading with zero posts', () => {
  assert.equal(feedListReady(true, 0, true), false)
  assert.equal(feedListReady(false, 0, false), false)
})

test('new account does not mount You keepalive until identity is ready', () => {
  assert.equal(
    canMountYouKeepalivePane({ signedIn: true, identityLoading: true, username: 'rip' }),
    false,
  )
  assert.equal(
    canMountYouKeepalivePane({ signedIn: true, identityLoading: false, username: 'rip' }),
    true,
  )
  assert.equal(
    canMountYouKeepalivePane({ signedIn: true, identityLoading: false, username: '' }),
    false,
  )
})
