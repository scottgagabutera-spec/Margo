import assert from 'node:assert/strict'
import test from 'node:test'
import { computeLandingSearchBump } from './landing-search-bump.ts'
import { STAGE_SEARCH_FIELD_PX, STAGE_SEARCH_ROW_PX } from './margo-chrome-metrics.ts'

test('landing bump shift is zero when keyboard band is tall', () => {
  const plan = computeLandingSearchBump({
    keyboardTop: 720,
    headerBottom: 68,
    blockTop: 280,
  })
  assert.equal(plan.shiftPx, 0)
})

test('406 keyboard top requires positive shift for low search block', () => {
  const input = {
    keyboardTop: 406,
    headerBottom: 57,
    blockTop: 232,
  }
  const plan = computeLandingSearchBump(input)
  assert.ok(plan.shiftPx > 0)
  const intro = plan.hideWordmark ? 0 : plan.hideTagline ? 40 : 81
  const searchTop = input.blockTop + intro - plan.shiftPx
  assert.ok(searchTop >= input.headerBottom + 8 - 1)
  assert.ok(plan.dropdownMaxPx >= STAGE_SEARCH_ROW_PX * 1.5)
  assert.ok(searchTop + STAGE_SEARCH_FIELD_PX <= input.keyboardTop + 1)
})
