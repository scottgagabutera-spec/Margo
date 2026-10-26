import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  phoneShortsCanvasHeightPx,
  phoneShortsCanvasWidthPx,
} from './shorts-phone-frame.ts'
import { computeShortsFrameLayoutForViewport } from './shorts-frame-layout.ts'

const CHROME = { navPx: 72, feedTabBarPx: 40, vibeBarPx: 0, mobileTabBarPx: 80 }

describe('phone Shorts canvas helpers', () => {
  it('width is viewport minus 32px margin', () => {
    assert.equal(phoneShortsCanvasWidthPx(360), 328)
    assert.equal(phoneShortsCanvasWidthPx(320), 288)
  })

  it('matches computeShortsFrameLayoutForViewport on phone', () => {
    const l = computeShortsFrameLayoutForViewport(390, 844, CHROME)
    assert.equal(phoneShortsCanvasWidthPx(390), l.frameWidthPx)
    assert.equal(l.frameHeightPx, phoneShortsCanvasHeightPx(l.frameWidthPx, l.scrollAreaHeightPx))
  })
})
