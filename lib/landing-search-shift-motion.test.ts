import assert from 'node:assert/strict'
import test from 'node:test'
import { shouldAnimateLandingShift } from './landing-search-shift-motion.ts'

test('shouldAnimateLandingShift: single ease path open and close', () => {
  assert.equal(shouldAnimateLandingShift(0, 120), true)
  assert.equal(shouldAnimateLandingShift(120, 118), false)
  assert.equal(shouldAnimateLandingShift(120, 0), true)
  assert.equal(shouldAnimateLandingShift(0, 0), false)
})
