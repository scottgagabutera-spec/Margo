import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  computeShortsFrameLayoutForViewport,
  SHORTS_DESKTOP_MIN_WIDTH,
} from './shorts-frame-layout.ts'

const CHROME = { navPx: 72, feedTabBarPx: 40, vibeBarPx: 0, mobileTabBarPx: 80 }

function layout(w: number, h: number) {
  return computeShortsFrameLayoutForViewport(w, h, CHROME)
}

function near(actual: number, expected: number, tol = 2) {
  assert.ok(
    Math.abs(actual - expected) <= tol,
    `expected ~${expected}, got ${actual}`,
  )
}

describe('computeShortsFrameLayoutForViewport', () => {
  it('desktop frame height never exceeds visible scroll area', () => {
    const l = layout(834, 900)
    assert.equal(l.columns, 1)
    assert.ok(l.frameHeightPx <= l.scrollAreaHeightPx - 48 + 1)
    assert.ok(Math.abs(l.frameWidthPx / l.frameHeightPx - 9 / 16) < 0.02)
  })

  /** Golden sizes with chrome nav 72 + feed tabs 40 + tab bar 80 (from CSS tokens). */
  const desktopCases: [number, number, number, number][] = [
    [1280, 720, 315, 560],
    [1366, 768, 342, 608],
    [1440, 900, 416.25, 740],
    [1536, 864, 396, 704],
    [1920, 1080, 517.5, 920],
    [2560, 1440, 540, 960],
    [834, 1194, 540, 960],
    [980, 2000, 540, 960],
  ]

  for (const [w, h, ew, eh] of desktopCases) {
    it(`desktop ${w}x${h} → ~${ew}x${eh}`, () => {
      assert.ok(w >= SHORTS_DESKTOP_MIN_WIDTH)
      const l = layout(w, h)
      near(l.frameWidthPx, ew, 3)
      near(l.frameHeightPx, eh, 3)
      assert.equal(l.slideStridePx, l.scrollAreaHeightPx)
    })
  }

  const phoneCases: [number, number, number, number][] = [
    [320, 568, 288, 348],
    [360, 640, 328, 420],
    [360, 800, 328, 580],
    [390, 844, 358, 624],
    [412, 915, 380, 695],
    [430, 932, 398, 712],
  ]

  for (const [w, h, ew, eh] of phoneCases) {
    it(`phone ${w}x${h} → ~${ew}x${eh}`, () => {
      const l = layout(w, h)
      near(l.frameWidthPx, ew, 2)
      near(l.frameHeightPx, eh, 2)
      assert.equal(l.slideStridePx, l.scrollAreaHeightPx)
    })
  }
})
