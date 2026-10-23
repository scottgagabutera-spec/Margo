import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  applyEchoListEditPatch,
  patchStackEchoEdit,
} from './lyric-back-owner-edit-local.ts'
import type { Echo } from '../hooks/useEchoes.ts'

function echo(id: string, lyric: string): Echo {
  return {
    id,
    lyric,
    song: 'S',
    artist: 'A',
    emotion: 'chill',
    username: 'u',
    timestamp: 1,
  }
}

describe('applyEchoListEditPatch', () => {
  it('updates only the matching row', () => {
    const list = [echo('a', 'one'), echo('b', 'two')]
    const next = applyEchoListEditPatch(list, 'a', {
      lyric: 'ONE',
      song: 'S2',
      artist: 'A2',
      emotion: 'joy',
    })
    assert.equal(next[0].lyric, 'ONE')
    assert.equal(next[1].lyric, 'two')
  })
})

describe('patchStackEchoEdit', () => {
  it('updates focused stack entry without changing length', () => {
    const stack = [echo('a', 'one'), echo('b', 'two')]
    const next = patchStackEchoEdit(stack, 'b', {
      lyric: 'TWO',
      song: 'S',
      artist: 'A',
      emotion: 'love',
    })
    assert.equal(next.length, 2)
    assert.equal(next[1].lyric, 'TWO')
    assert.equal(next[0].lyric, 'one')
  })
})
