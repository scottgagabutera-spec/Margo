import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { defaultAvatarUrlForSeed } from './default-avatar-url.ts'

describe('defaultAvatarUrlForSeed', () => {
  it('is stable for the same seed', () => {
    const a = defaultAvatarUrlForSeed('n2music')
    const b = defaultAvatarUrlForSeed('n2music')
    assert.equal(a, b)
    assert.match(a, /dicebear\.com\/9\.x\/notionists/)
    assert.match(a, /seed=n2music/)
  })

  it('falls back when seed is empty', () => {
    assert.match(defaultAvatarUrlForSeed(''), /seed=margo/)
  })
})
