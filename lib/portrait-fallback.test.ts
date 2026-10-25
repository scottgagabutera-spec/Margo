import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { portraitFallbackFromSeed } from './portrait-fallback.ts'

describe('portraitFallbackFromSeed', () => {
  it('is stable and gender-neutral (initial only)', () => {
    const a = portraitFallbackFromSeed('dee')
    const b = portraitFallbackFromSeed('dee')
    assert.equal(a.initial, 'D')
    assert.equal(a.initial, b.initial)
    assert.equal(a.background, b.background)
    assert.match(a.background, /linear-gradient/)
  })
})
