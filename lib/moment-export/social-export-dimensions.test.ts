import assert from 'node:assert/strict'
import test from 'node:test'
import { EXPORT_SHAPE_CYCLE, EXPORT_SHAPE_HINTS } from './export-shapes.ts'

test('export UI offers Square and Story only', () => {
  assert.deepEqual(EXPORT_SHAPE_CYCLE, ['square', 'vertical'])
})

test('export hints lock 1:1 and 9:16 preview ratios', () => {
  assert.equal(EXPORT_SHAPE_HINTS.square, '1:1')
  assert.equal(EXPORT_SHAPE_HINTS.vertical, '9:16')
})

test('canonical PNG export pixels (single source in export-png-output-size)', async () => {
  const { momentPngOutputPixelSize } = await import('./export-png-output-size.ts')
  assert.deepEqual(momentPngOutputPixelSize('square'), { width: 1080, height: 1080 })
  assert.deepEqual(momentPngOutputPixelSize('vertical'), { width: 1080, height: 1920 })
})
