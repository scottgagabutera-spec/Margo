import assert from 'node:assert/strict'
import test from 'node:test'
import { isFeedStackPath } from './feed-stack-routes.ts'

test('feed stack paths include echoes and profile', () => {
  assert.equal(isFeedStackPath('/profile/alice'), true)
  assert.equal(isFeedStackPath('/echoes/abc'), true)
  assert.equal(isFeedStackPath('/memories/new'), true)
  assert.equal(isFeedStackPath('/feed'), false)
  assert.equal(isFeedStackPath('/discover'), false)
  assert.equal(isFeedStackPath('/e2e/feed-stack-depth'), true)
  assert.equal(isFeedStackPath('/search'), true)
})
