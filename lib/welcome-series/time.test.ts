import assert from 'node:assert/strict'
import { test } from 'node:test'
import { effectiveHoursSinceAnchor, welcomeSeriesTimeScale } from './time.ts'

test('welcomeSeriesTimeScale is 1 in production', () => {
  const prev = process.env.VERCEL_ENV
  process.env.VERCEL_ENV = 'production'
  delete process.env.WELCOME_SERIES_PREVIEW_TIME_SCALE
  assert.equal(welcomeSeriesTimeScale(), 1)
  process.env.VERCEL_ENV = prev
})

test('effectiveHoursSinceAnchor honors dev override', () => {
  const anchor = '2026-11-08T00:00:00.000Z'
  assert.equal(effectiveHoursSinceAnchor(anchor, Date.now(), 72), 72)
})
