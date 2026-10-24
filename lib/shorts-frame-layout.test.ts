import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { computeShortsFrameLayout } from './shorts-frame-layout.ts'

describe('computeShortsFrameLayout', () => {
  it('phone frame uses full width minus padding', () => {
    const l = computeShortsFrameLayout(390, 844, 120, 88)
    assert.equal(l.columns, 1)
    assert.ok(Math.abs(l.frameWidthPx - 358) < 2)
    assert.ok(Math.abs(l.frameHeightPx / l.frameWidthPx - 16 / 9) < 0.02)
  })

  it('desktop uses peek stride (~1.5 frame heights visible)', () => {
    const l = computeShortsFrameLayout(834, 900, 120, 88)
    assert.equal(l.columns, 1)
    assert.ok(l.slideStridePx > l.frameHeightPx)
    assert.ok(l.slideStridePx / l.frameHeightPx < 1.55)
  })

  it('very wide uses two columns when pair fits', () => {
    const l = computeShortsFrameLayout(1920, 1080, 120, 88)
    assert.equal(l.columns, 2)
  })
})
