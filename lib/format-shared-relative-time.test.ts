import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { formatSharedRelativeTime } from './format-shared-relative-time.ts'

const DAY = 86_400_000
const HOUR = 3_600_000
const MIN = 60_000

describe('formatSharedRelativeTime', () => {
  const now = Date.parse('2026-10-25T12:00:00.000Z')

  it('future timestamp shows just now', () => {
    assert.equal(formatSharedRelativeTime(now + MIN, now), 'just now')
  })

  it('just now under 60 seconds', () => {
    assert.equal(formatSharedRelativeTime(now - 30_000, now), 'just now')
  })

  it('minutes singular and plural', () => {
    assert.equal(formatSharedRelativeTime(now - MIN, now), '1 minute ago')
    assert.equal(formatSharedRelativeTime(now - 5 * MIN, now), '5 minutes ago')
  })

  it('hours singular and plural', () => {
    assert.equal(formatSharedRelativeTime(now - HOUR, now), '1 hour ago')
    assert.equal(formatSharedRelativeTime(now - 3 * HOUR, now), '3 hours ago')
  })

  it('days through 6 days (before weeks)', () => {
    assert.equal(formatSharedRelativeTime(now - DAY, now), '1 day ago')
    assert.equal(formatSharedRelativeTime(now - 6 * DAY, now), '6 days ago')
  })

  it('weeks from 7 days until before 30 days', () => {
    assert.equal(formatSharedRelativeTime(now - 7 * DAY, now), '1 week ago')
    assert.equal(formatSharedRelativeTime(now - 21 * DAY, now), '3 weeks ago')
    assert.equal(formatSharedRelativeTime(now - 29 * DAY, now), '4 weeks ago')
  })

  it('months from 30 days until before 365 days', () => {
    assert.equal(formatSharedRelativeTime(now - 30 * DAY, now), '1 month ago')
    assert.equal(formatSharedRelativeTime(now - 180 * DAY, now), '6 months ago')
    assert.equal(formatSharedRelativeTime(now - 364 * DAY, now), '12 months ago')
  })

  it('years at 365+ days', () => {
    assert.equal(formatSharedRelativeTime(now - 365 * DAY, now), '1 year ago')
    assert.equal(formatSharedRelativeTime(now - 730 * DAY, now), '2 years ago')
  })

  it('never returns a bare calendar month string', () => {
    const old = now - 400 * DAY
    const label = formatSharedRelativeTime(old, now)
    assert.match(label, /year/)
    assert.doesNotMatch(label, /^[A-Z][a-z]{2}\s/)
  })
})
