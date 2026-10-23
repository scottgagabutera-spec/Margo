import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseLyricBackWriteBody } from './lyric-back-request.ts'

describe('parseLyricBackWriteBody', () => {
  it('accepts valid payload', () => {
    const r = parseLyricBackWriteBody({
      text: 'hello',
      songTitle: 'Song',
      artistName: 'Artist',
      emotion: 'chill',
    })
    assert.equal(r.ok, true)
    if (r.ok) assert.equal(r.body.emotion, 'chill')
  })

  it('rejects invalid vibe', () => {
    const r = parseLyricBackWriteBody({
      text: 'hello',
      songTitle: 'Song',
      artistName: 'Artist',
      emotion: 'not-a-vibe',
    })
    assert.equal(r.ok, false)
  })
})
