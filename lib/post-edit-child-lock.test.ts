import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  lyricBackSongOrLineChanged,
  momentPrimaryLineChanged,
} from './post-edit-child-lock.ts'

describe('post edit child lock compares', () => {
  it('detects lyric-back song change', () => {
    const base = {
      text: 'line',
      songId: 'a',
      songTitle: 'A',
      artistName: 'X',
      snippetStartSec: 0,
      snippetEndSec: 8,
    }
    assert.equal(lyricBackSongOrLineChanged(base, { ...base, songTitle: 'B' }), true)
    assert.equal(lyricBackSongOrLineChanged(base, { ...base }), false)
  })

  it('detects moment line text change only', () => {
    const base = {
      text: 'hello',
      songId: null,
      songTitle: 'S',
      artistName: 'A',
      snippetStart: null,
      snippetEnd: null,
    }
    assert.equal(momentPrimaryLineChanged(base, { ...base, text: 'hi' }), true)
    assert.equal(momentPrimaryLineChanged(base, base), false)
  })
})
