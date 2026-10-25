import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  describeShortsLook,
  pickShortsLook,
  SHORTS_LOOKS,
  SHORTS_FREE_LOOKS,
  SHORTS_LOOK_MODE_SHARES,
} from './shorts-looks.ts'

describe('shorts looks', () => {
  it('pick is stable for same song/day/vibe', () => {
    const a = pickShortsLook('song-1', 'HOPE', '2026-10-22')
    const b = pickShortsLook('song-1', 'HOPE', '2026-10-22')
    assert.equal(a.id, b.id)
    assert.equal(a.mode, b.mode)
  })

  it('registers free and paid tiers', () => {
    assert.ok(SHORTS_LOOKS.some((l) => l.tier === 'paid'))
    assert.ok(SHORTS_FREE_LOOKS.every((l) => l.tier === 'free'))
  })

  it('never picks paid looks for shelf', () => {
    for (const vibe of ['PROUD', 'HYPE', 'JOY', 'HOPE', 'LOVE']) {
      for (let i = 0; i < 20; i++) {
        const look = pickShortsLook(`song-${i}`, vibe, '2026-10-22')
        assert.notEqual(look.tier, 'paid')
        assert.notEqual(look.id, 'gold-drift-paid')
      }
    }
  })

  it('mix includes colour-only and effect-only across sample songs', () => {
    const modes = new Set<string>()
    for (let i = 0; i < 48; i++) {
      modes.add(pickShortsLook(`mix-song-${i}`, 'CHILL', '2026-10-22').mode)
    }
    assert.ok(modes.has('colour-only'))
    assert.ok(modes.has('effect-only'))
    assert.ok(modes.has('colour-and-effect'))
  })

  it('colour-only uses still atmosphere', () => {
    for (let i = 0; i < 80; i++) {
      const look = pickShortsLook(`colour-probe-${i}`, 'LOVE', '2026-10-22')
      if (look.mode === 'colour-only') {
        assert.equal(look.atmosphereId, 'still')
      }
      if (look.mode === 'effect-only') {
        assert.notEqual(look.atmosphereId, 'still')
      }
    }
  })

  it('mode shares config sums to 100', () => {
    const s = SHORTS_LOOK_MODE_SHARES
    assert.equal(s.colourOnly + s.effectOnly + s.colourAndEffect, 100)
  })

  it('neighbouring fixture songs rarely share full look signature', () => {
    const day = '2026-10-22'
    const sigs: string[] = []
    for (let i = 0; i < 6; i++) {
      const look = pickShortsLook(`e2e-song-${String.fromCharCode(97 + i)}`, 'HOPE', day)
      sigs.push(describeShortsLook(look))
    }
    assert.ok(new Set(sigs).size >= 3)
  })
})
