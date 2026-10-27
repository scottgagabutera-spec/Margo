import assert from 'node:assert/strict'
import test from 'node:test'
import { estimateKeyboardHeightPx, readVisualBand } from './margo-keyboard-geometry.ts'

test('estimate keyboard height for 717px layout', () => {
  assert.equal(estimateKeyboardHeightPx(717), 311)
})

test('readVisualBand uses shrunk visualViewport height', () => {
  const win = {
    innerHeight: 717,
    visualViewport: { height: 406, offsetTop: 0 },
    document: { activeElement: null },
  } as unknown as Window
  const band = readVisualBand(win)
  assert.equal(band.keyboardTop, 406)
  assert.equal(band.vvHeight, 406)
})
