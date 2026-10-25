import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  PHONE_SHORTS_CANVAS_CAP_PX,
  phoneShortsCanvasHeightPx,
  phoneShortsCanvasWidthPx,
} from './shorts-phone-frame.ts'

describe('phone Shorts canvas (main size cap)', () => {
  it('caps card width at 320px on phone viewports', () => {
    assert.equal(PHONE_SHORTS_CANVAS_CAP_PX, 320)
    assert.equal(phoneShortsCanvasWidthPx(360), 320)
    assert.equal(phoneShortsCanvasWidthPx(390), 320)
    assert.equal(phoneShortsCanvasWidthPx(430), 320)
  })

  it('9:16 height from 320px width matches main phone card', () => {
    const h390 = phoneShortsCanvasHeightPx(phoneShortsCanvasWidthPx(390))
    assert.ok(Math.abs(h390 - 568.888) < 1)
    const h360 = phoneShortsCanvasHeightPx(phoneShortsCanvasWidthPx(360))
    assert.ok(Math.abs(h360 - 568.888) < 1)
  })
})
