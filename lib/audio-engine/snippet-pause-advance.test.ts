import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getSnippetRemainingStopMs,
  getSnippetStopDurationMs,
  maySnippetEndAdvanceQueue,
  SNIPPET_END_PAD_SEC,
} from './types.ts'

test('maySnippetEndAdvanceQueue is false while paused', () => {
  assert.equal(maySnippetEndAdvanceQueue(false), false)
  assert.equal(maySnippetEndAdvanceQueue(true), true)
})

test('getSnippetRemainingStopMs shrinks after partial playback', () => {
  const start = 10
  const end = 15
  const full = getSnippetStopDurationMs(start, end)
  const half = getSnippetRemainingStopMs(start, end, 12.5)
  assert.ok(half < full)
  assert.ok(half > 0)
})

test('pause mid-snippet: remaining timer covers only tail (simulated pool)', () => {
  const start = 0
  const end = 4
  const pausedAt = 2
  const remainMs = getSnippetRemainingStopMs(start, end, pausedAt)
  const expectedSec = end + SNIPPET_END_PAD_SEC - pausedAt
  assert.equal(Math.round(remainMs), Math.round(expectedSec * 1000))

  let playing = true
  let queueIndex = 0
  const advance = () => { queueIndex += 1 }

  const onTimerFire = () => {
    if (!maySnippetEndAdvanceQueue(playing)) return
    advance()
  }

  playing = true
  onTimerFire()
  assert.equal(queueIndex, 1)

  queueIndex = 0
  playing = false
  onTimerFire()
  assert.equal(queueIndex, 0, 'paused: scheduled end must not advance')

  playing = true
  onTimerFire()
  assert.equal(queueIndex, 1, 'resume then natural end advances')
})
