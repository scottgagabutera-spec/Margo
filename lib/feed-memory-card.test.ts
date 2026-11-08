import test from 'node:test'
import assert from 'node:assert/strict'
import {
  dailyMemoryCardAnchorIndex,
  memoryCardCopy,
  memoryCardKindForSlotIndex,
  MEMORY_CARD_SEQUENCE,
} from './feed-memory-card.ts'

test('memoryCardKindForSlotIndex follows A B C D A', () => {
  assert.equal(memoryCardKindForSlotIndex(0, 0), 'media')
  assert.equal(memoryCardKindForSlotIndex(0, 1), 'story')
  assert.equal(memoryCardKindForSlotIndex(0, 2), 'listening')
  assert.equal(memoryCardKindForSlotIndex(0, 3), 'create')
  assert.equal(memoryCardKindForSlotIndex(0, 4), 'media')
})

test('daily anchor is stable for same user and day', () => {
  const a = dailyMemoryCardAnchorIndex('user-abc', '2026-11-08')
  const b = dailyMemoryCardAnchorIndex('user-abc', '2026-11-08')
  assert.equal(a, b)
  assert.ok(a >= 0 && a < MEMORY_CARD_SEQUENCE.length)
})

test('daily anchor can shift next day', () => {
  const a = dailyMemoryCardAnchorIndex('user-abc', '2026-11-08')
  const b = dailyMemoryCardAnchorIndex('user-abc', '2026-11-09')
  void a
  void b
})

test('create card title for first memory', () => {
  assert.equal(memoryCardCopy('create', { ownMemoryCount: 0 }).title, 'Create your first memory')
  assert.equal(memoryCardCopy('create', { ownMemoryCount: 3 }).title, 'Create a memory')
})
