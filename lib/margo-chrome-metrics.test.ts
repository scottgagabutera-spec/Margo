import assert from 'node:assert/strict'
import test from 'node:test'
import {
  LANDING_NAV_ESTIMATE_PX,
  STAGE_SEARCH_FIELD_PX,
  STAGE_SEARCH_ROW_PX,
  landingHeroBlockHeightPx,
  landingSearchNeededBottomPx,
} from './margo-chrome-metrics.ts'

test('measurement table constants match built CSS', () => {
  assert.equal(STAGE_SEARCH_FIELD_PX, 44)
  assert.equal(STAGE_SEARCH_ROW_PX, 68)
  assert.equal(LANDING_NAV_ESTIMATE_PX, 68)
  assert.equal(landingHeroBlockHeightPx(), 125)
})

test('keyboard 360x406 needed results band', () => {
  const headerBottom = 83
  const blockTop = 200
  const searchBottom = blockTop + landingHeroBlockHeightPx()
  const neededBottom = searchBottom + 8 + STAGE_SEARCH_ROW_PX * 2.5 + 8
  const vvBottom = 406
  assert.ok(neededBottom > vvBottom)
  assert.equal(landingSearchNeededBottomPx(blockTop + landingHeroBlockHeightPx()), searchBottom + 8 + 170 + 8)
})
