import assert from 'node:assert/strict'
import test from 'node:test'
import {
  HUB_LAUNCHER_GRID_COLUMNS_DESKTOP,
  HUB_LAUNCHER_GRID_COLUMNS_PHONE,
  HUB_LAUNCHER_PANEL_WIDTH_DESKTOP_PX,
} from './hub-launcher-layout.ts'

test('A4 hub launcher uses three columns on phone and desktop', () => {
  assert.equal(HUB_LAUNCHER_GRID_COLUMNS_PHONE, 3)
  assert.equal(HUB_LAUNCHER_GRID_COLUMNS_DESKTOP, 3)
})

test('A5 desktop hub panel is wide enough for Music Library label', () => {
  assert.ok(HUB_LAUNCHER_PANEL_WIDTH_DESKTOP_PX >= 330)
  assert.ok(HUB_LAUNCHER_PANEL_WIDTH_DESKTOP_PX <= 340)
})
