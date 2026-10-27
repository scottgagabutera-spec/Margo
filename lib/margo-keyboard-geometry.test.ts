import assert from 'node:assert/strict'
import test from 'node:test'
import { estimateKeyboardHeightPx, readVisualBand } from './margo-keyboard-geometry.ts'

test('estimate keyboard height for 717px layout', () => {
  assert.equal(estimateKeyboardHeightPx(717), 311)
})

test('readVisualBand uses __margoVvMock when present', () => {
  const win = {
    innerHeight: 717,
    visualViewport: { height: 717, offsetTop: 0 },
    document: { activeElement: null },
    __margoVvMock: { open: true, fullH: 717, keyboardH: 311, mode: 'resizes-visual' },
  } as unknown as Window
  const band = readVisualBand(win)
  assert.equal(band.keyboardTop, 406)
  assert.equal(band.vvHeight, 406)
  assert.equal(band.innerHeight, 717)
})
