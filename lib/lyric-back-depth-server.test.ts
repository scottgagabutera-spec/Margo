import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  lyricBackChildDepthAllowed,
  lyricBackDepthCapErrorMessage,
} from './lyric-back-depth-server.ts'
import { LYRIC_BACK_DEPTH_CAP } from './lyric-back-depth.ts'

describe('lyricBackChildDepthAllowed', () => {
  it('allows child at cap depth', () => {
    assert.equal(lyricBackChildDepthAllowed(LYRIC_BACK_DEPTH_CAP - 1), true)
  })

  it('rejects when parent is at cap', () => {
    assert.equal(lyricBackChildDepthAllowed(LYRIC_BACK_DEPTH_CAP), false)
  })
})

describe('lyricBackDepthCapErrorMessage', () => {
  it('returns user-facing copy', () => {
    assert.match(lyricBackDepthCapErrorMessage(), /too deep/i)
  })
})
