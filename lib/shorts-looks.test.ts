import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { pickShortsLook, SHORTS_LOOKS } from './shorts-looks.ts'

describe('shorts looks', () => {
  it('pick is stable for same song/day/vibe', () => {
    const a = pickShortsLook('song-1', 'HOPE', '2026-10-22')
    const b = pickShortsLook('song-1', 'HOPE', '2026-10-22')
    assert.equal(a.id, b.id)
  })

  it('registers free and paid tiers', () => {
    assert.ok(SHORTS_LOOKS.some((l) => l.tier === 'paid'))
    assert.ok(SHORTS_LOOKS.some((l) => l.tier === 'free'))
  })
})
