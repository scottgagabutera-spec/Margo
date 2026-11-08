import test from 'node:test'
import assert from 'node:assert/strict'
import { memoryCardCopy, pickNextMemoryCard } from './feed-memory-card.ts'

test('pickNextMemoryCard rotates without repeating', () => {
  assert.equal(pickNextMemoryCard(null), 'media')
  assert.equal(pickNextMemoryCard('media'), 'story')
  assert.equal(pickNextMemoryCard('story'), 'listening')
  assert.equal(pickNextMemoryCard('listening'), 'create')
  assert.equal(pickNextMemoryCard('create'), 'media')
})

test('create card title for first memory', () => {
  assert.equal(memoryCardCopy('create', { ownMemoryCount: 0 }).title, 'Create your first memory')
  assert.equal(memoryCardCopy('create', { ownMemoryCount: 3 }).title, 'Create a memory')
})
