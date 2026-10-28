import assert from 'node:assert/strict'
import test from 'node:test'
import { applyMonotonicLandingShift } from './landing-search-shift-apply.ts'

test('opening: shift never decreases', () => {
  assert.equal(applyMonotonicLandingShift(80, 40, 'open'), 80)
  assert.equal(applyMonotonicLandingShift(40, 90, 'open'), 90)
})

test('closing: shift never increases', () => {
  assert.equal(applyMonotonicLandingShift(80, 40, 'close'), 40)
  assert.equal(applyMonotonicLandingShift(20, 60, 'close'), 20)
})
