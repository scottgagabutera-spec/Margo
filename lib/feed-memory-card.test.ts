import test from 'node:test'
import assert from 'node:assert/strict'
import { dailyMemoryCardAnchorIndex, memoryCardCopy } from './feed-memory-card.ts'

test('memory card copy three promos', () => {
  assert.equal(memoryCardCopy('pictures', {}).title, 'Add photos and videos')
  assert.equal(memoryCardCopy('story', {}).title, 'Tell your story')
  assert.equal(memoryCardCopy('memory', {}).title, 'Create a memory')
})

test('daily anchor stable for user and day', () => {
  const a = dailyMemoryCardAnchorIndex('user-abc', '2026-11-08')
  const b = dailyMemoryCardAnchorIndex('user-abc', '2026-11-08')
  assert.equal(a, b)
  assert.ok(a >= 0 && a < 5)
})
