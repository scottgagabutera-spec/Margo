import assert from 'node:assert/strict'
import test from 'node:test'
import { isPreciseTap } from './precise-tap.ts'

test('precise tap accepts short stationary touch', () => {
  const start = { x: 10, y: 20, t: 1000 }
  assert.equal(isPreciseTap(start, 12, 21, 1100), true)
})

test('precise tap rejects scroll drift', () => {
  const start = { x: 10, y: 20, t: 1000 }
  assert.equal(isPreciseTap(start, 30, 20, 1100), false)
})

test('precise tap rejects long press', () => {
  const start = { x: 10, y: 20, t: 1000 }
  assert.equal(isPreciseTap(start, 11, 20, 1400), false)
})
