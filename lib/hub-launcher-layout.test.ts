import assert from 'node:assert/strict'
import test from 'node:test'
import {
  HUB_LAUNCHER_GRID_COLUMNS_DESKTOP,
  HUB_LAUNCHER_GRID_COLUMNS_PHONE,
  HUB_LAUNCHER_PANEL_WIDTH_DESKTOP_PX,
} from './hub-launcher-layout.ts'

test('hub launcher uses four-column app grid on phone and desktop', () => {
  assert.equal(HUB_LAUNCHER_GRID_COLUMNS_PHONE, 4)
  assert.equal(HUB_LAUNCHER_GRID_COLUMNS_DESKTOP, 4)
})

test('desktop hub panel is wide enough for Notifications label', () => {
  assert.ok(HUB_LAUNCHER_PANEL_WIDTH_DESKTOP_PX >= 360)
})
