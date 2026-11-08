import assert from 'node:assert/strict'
import test from 'node:test'
import { momentPngOutputPixelSize } from './export-png-output-size.ts'
import { STAGE_CARD_EXPORT_SCALE } from './layout/constants.ts'

test('PNG export output is 1080×1080 for Square', () => {
  assert.deepEqual(momentPngOutputPixelSize('square'), { width: 1080, height: 1080 })
})

test('PNG export output is 1080×1920 for Story', () => {
  assert.deepEqual(momentPngOutputPixelSize('vertical'), { width: 1080, height: 1920 })
})

test('stage-card PNG path supersamples then downscales to output size', () => {
  assert.equal(1080 * STAGE_CARD_EXPORT_SCALE, 3240)
  assert.equal(1920 * STAGE_CARD_EXPORT_SCALE, 5760)
  assert.deepEqual(momentPngOutputPixelSize('square'), { width: 1080, height: 1080 })
  assert.deepEqual(momentPngOutputPixelSize('vertical'), { width: 1080, height: 1920 })
})
