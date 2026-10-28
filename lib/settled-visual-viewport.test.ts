import assert from 'node:assert/strict'
import test from 'node:test'
import {
  attachSettledVisualViewportListener,
  snapshotsWithinEpsilon,
} from './settled-visual-viewport.ts'

test('snapshotsWithinEpsilon ignores sub-2px noise', () => {
  assert.equal(
    snapshotsWithinEpsilon({ height: 400, offsetTop: 0 }, { height: 401, offsetTop: 1 }),
    true,
  )
  assert.equal(
    snapshotsWithinEpsilon({ height: 400, offsetTop: 0 }, { height: 403, offsetTop: 0 }),
    false,
  )
})

test('keyboard open/close: intermediate resizes commit once per settled band', async () => {
  let height = 844
  let offsetTop = 0
  const vvHandlers: Record<string, Set<() => void>> = { resize: new Set(), scroll: new Set() }
  const winHandlers: Record<string, Set<() => void>> = { resize: new Set() }

  const g = globalThis as typeof globalThis & { window: Window }
  g.window = {
    innerHeight: 844,
    visualViewport: {
      get height() {
        return height
      },
      get offsetTop() {
        return offsetTop
      },
      addEventListener(type: string, fn: () => void) {
        vvHandlers[type]?.add(fn)
      },
      removeEventListener(type: string, fn: () => void) {
        vvHandlers[type]?.delete(fn)
      },
    },
    addEventListener(type: string, fn: () => void) {
      winHandlers[type]?.add(fn)
    },
    removeEventListener(type: string, fn: () => void) {
      winHandlers[type]?.delete(fn)
    },
    requestAnimationFrame: (cb: FrameRequestCallback) => {
      cb(0)
      return 1
    },
    cancelAnimationFrame: () => {},
  } as unknown as Window
  g.requestAnimationFrame = g.window.requestAnimationFrame.bind(g.window)
  g.cancelAnimationFrame = g.window.cancelAnimationFrame.bind(g.window)

  const settled: number[] = []
  attachSettledVisualViewportListener({
    debounceMs: 20,
    onSettled: (snap) => {
      settled.push(Math.round(snap.height))
    },
  })

  const pulseResize = async (heights: number[]) => {
    for (const h of heights) {
      height = h
      for (const fn of vvHandlers.resize!) fn()
      for (const fn of winHandlers.resize!) fn()
      await new Promise((r) => setTimeout(r, 4))
    }
    await new Promise((r) => setTimeout(r, 35))
  }

  await pulseResize([820, 780, 720, 650, 580, 520, 480, 440])
  assert.equal(settled.length, 1)
  assert.equal(settled[0], 440)

  await pulseResize([480, 540, 620, 720, 800, 844])
  assert.equal(settled.length, 2)
  assert.equal(settled[1], 844)

  for (let i = 1; i < settled.length; i++) {
    const prev = settled[i - 1]!
    const next = settled[i]!
    assert.ok(!(prev > 500 && next > prev && next < 844), `bounce ${prev} -> ${next}`)
  }
})
