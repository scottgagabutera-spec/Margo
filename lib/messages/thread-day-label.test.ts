import assert from 'node:assert/strict'
import test from 'node:test'
import { threadDayKey, threadDayLabel } from './thread-day-label.ts'

test('threadDayLabel returns Today for same calendar day', () => {
  const now = new Date(2026, 9, 27, 12, 0, 0).getTime()
  const iso = new Date(2026, 9, 27, 8, 0, 0).toISOString()
  assert.equal(threadDayLabel(iso, now), 'Today')
})

test('threadDayKey groups messages on the same day', () => {
  assert.equal(
    threadDayKey('2026-10-27T08:00:00Z'),
    threadDayKey('2026-10-27T20:00:00Z'),
  )
})
