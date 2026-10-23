import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  applyEchoListDeleteOutcome,
  decrementEchoCountField,
  patchStackAfterOwnerDelete,
} from '@/lib/lyric-back-owner-delete-local'
import type { Echo } from '@/hooks/useEchoes'

const base = (id: string, echoCount = 0): Echo => ({
  id,
  lyric: 'line',
  song: 'Song',
  artist: 'Artist',
  emotion: 'chill',
  username: 'u',
  timestamp: 1,
  echoCount,
})

describe('applyEchoListDeleteOutcome', () => {
  it('removes row on full delete', () => {
    const list = [base('a'), base('b')]
    const next = applyEchoListDeleteOutcome(list, 'a', 'deleted')
    assert.equal(next.length, 1)
    assert.equal(next[0].id, 'b')
  })

  it('shells row in place', () => {
    const list = [base('a', 2)]
    const next = applyEchoListDeleteOutcome(list, 'a', 'shelled', '2026-01-01T00:00:00.000Z')
    assert.equal(next.length, 1)
    assert.equal(next[0].contentRemovedAt, '2026-01-01T00:00:00.000Z')
    assert.equal(next[0].lyric, '')
    assert.equal(next[0].echoCount, 2)
  })
})

describe('patchStackAfterOwnerDelete', () => {
  it('truncates stack when focused echo fully deleted', () => {
    const stack = [base('p1'), base('p2')]
    const next = patchStackAfterOwnerDelete(stack, 'p2', 'deleted')
    assert.equal(next.length, 1)
    assert.equal(next[0].id, 'p1')
  })
})

describe('decrementEchoCountField', () => {
  it('never goes below zero', () => {
    assert.equal(decrementEchoCountField(base('x', 0)).echoCount, 0)
    assert.equal(decrementEchoCountField(base('x', 3)).echoCount, 2)
  })
})
