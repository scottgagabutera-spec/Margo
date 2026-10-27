import assert from 'node:assert/strict'
import test from 'node:test'
import { computeLandingSearchBump } from './landing-search-bump.ts'
import { STAGE_SEARCH_FIELD_PX, STAGE_SEARCH_ROW_PX } from './margo-chrome-metrics.ts'

test('landing bump shift is zero on tall viewport when block is low', () => {
  const plan = computeLandingSearchBump({
    offsetTop: 0,
    viewportHeight: 720,
    headerBottom: 68,
    blockTop: 280,
  })
  assert.equal(plan.shiftPx, 0)
  assert.equal(plan.hideTagline, false)
  assert.equal(plan.hideWordmark, false)
})

test('360x406 applies bounded shift and dropdown cap', () => {
  const input = {
    offsetTop: 0,
    viewportHeight: 406,
    headerBottom: 83,
    blockTop: 210,
  }
  const plan = computeLandingSearchBump(input)
  assert.ok(plan.shiftPx >= 0)
  assert.ok(plan.shiftPx <= input.blockTop - (input.headerBottom + 8))
  assert.ok(plan.dropdownMaxPx >= STAGE_SEARCH_ROW_PX * 1.5)
  const intro = plan.hideWordmark ? 0 : plan.hideTagline ? 40 : 81
  const searchTop = input.blockTop + intro - plan.shiftPx
  assert.ok(searchTop >= input.headerBottom + 8 - 1)
  assert.ok(searchTop + STAGE_SEARCH_FIELD_PX <= input.viewportHeight + 1)
})
