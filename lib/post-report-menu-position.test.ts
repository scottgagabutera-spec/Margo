import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { computeReportPopoverPosition } from './post-report-menu-position.ts'

describe('computeReportPopoverPosition', () => {
  it('opens below when there is room', () => {
    const r = computeReportPopoverPosition({
      triggerRect: { top: 100, bottom: 144, left: 300, right: 344, width: 44, height: 44, x: 300, y: 100, toJSON: () => ({}) },
      menuWidth: 160,
      menuHeight: 44,
      viewportTop: 0,
      viewportBottom: 800,
      viewportWidth: 390,
    })
    assert.equal(r.openUp, false)
    assert.equal(r.top, 150)
  })

  it('flips up when below is tight', () => {
    const r = computeReportPopoverPosition({
      triggerRect: { top: 720, bottom: 764, left: 300, right: 344, width: 44, height: 44, x: 300, y: 720, toJSON: () => ({}) },
      menuWidth: 160,
      menuHeight: 44,
      viewportTop: 0,
      viewportBottom: 800,
      viewportWidth: 390,
    })
    assert.equal(r.openUp, true)
    assert.equal(r.top, 670)
  })
})
