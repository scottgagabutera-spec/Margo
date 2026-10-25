import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { formatSharedRelativeTime } from './format-shared-relative-time.ts'

describe('formatSharedRelativeTime', () => {
  const now = Date.parse('2026-10-25T12:00:00.000Z')

  it('formats day bucket with Shared prefix', () => {
    const then = now - 86_400_000
    assert.equal(formatSharedRelativeTime(then, now), 'Shared 1 day ago')
  })

  it('formats absolute date at 7+ days', () => {
    const then = now - 8 * 86_400_000
    assert.match(formatSharedRelativeTime(then, now), /^Shared Oct/)
  })
})
