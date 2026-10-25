import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { defaultAvatarUrlForSeed } from './default-avatar-url.ts'

describe('defaultAvatarUrlForSeed (removed)', () => {
  it('returns null — portraits use in-app seed gradients', () => {
    assert.equal(defaultAvatarUrlForSeed('anyone'), null)
  })
})
