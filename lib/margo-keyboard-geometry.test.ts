import assert from 'node:assert/strict'
import test from 'node:test'
import { readVisualBand } from './margo-keyboard-geometry.ts'

test('readVisualBand uses shrunk visualViewport', () => {
  const win = {
    innerHeight: 717,
    visualViewport: { height: 406, offsetTop: 0 },
    document: { activeElement: null },
  } as unknown as Window
  const band = readVisualBand(win)
  assert.equal(band.keyboardTop, 406)
})
