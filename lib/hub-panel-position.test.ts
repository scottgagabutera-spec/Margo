import assert from 'node:assert/strict'
import test from 'node:test'
import { computeHubPanelPosition } from './hub-panel-position.ts'

test('computeHubPanelPosition aligns panel right edge to anchor within 16px', () => {
  const anchorRect = {
    left: 1200,
    right: 1240,
    top: 20,
    bottom: 52,
    width: 40,
    height: 32,
    x: 1200,
    y: 20,
    toJSON: () => ({}),
  } as DOMRect
  const pos = computeHubPanelPosition({
    anchorRect,
    panelWidth: 236,
    panelHeight: 400,
    viewportWidth: 1280,
    viewportHeight: 800,
    margin: 8,
    gap: 8,
  })
  assert.ok(Math.abs(pos.left - (1240 - 236)) <= 16)
  assert.equal(pos.top, 60)
  assert.ok(pos.left >= 8)
  assert.ok(pos.left + 236 <= 1280 - 8)
})

test('computeHubPanelPosition clamps when anchor rect is zero (hidden tab bar)', () => {
  const zero = {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect
  const pos = computeHubPanelPosition({
    anchorRect: zero,
    panelWidth: 236,
    panelHeight: 400,
    viewportWidth: 1280,
    viewportHeight: 800,
  })
  assert.equal(pos.left, 8)
  assert.equal(pos.top, 8)
})
