import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { computeShortsFrameLayout } from './shorts-frame-layout.ts'

describe('computeShortsFrameLayout', () => {
  it('desktop frame height never exceeds visible area', () => {
    const l = computeShortsFrameLayout(834, 900, 120, 88)
    assert.equal(l.columns, 1)
    assert.ok(l.frameHeightPx <= 900 - 120 - 88 + 1)
    assert.ok(Math.abs(l.frameWidthPx / l.frameHeightPx - 9 / 16) < 0.02)
  })

  it('very wide stays one column centered', () => {
    const l = computeShortsFrameLayout(1920, 1080, 120, 88)
    assert.equal(l.columns, 1)
  })
})
