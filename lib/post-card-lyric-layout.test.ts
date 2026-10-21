import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { feedLyricNeedsExpand } from './post-card-lyric-layout.ts'

describe('feedLyricNeedsExpand', () => {
  it('needs expand for long single-line copy', () => {
    assert.equal(feedLyricNeedsExpand('x'.repeat(181)), true)
  })

  it('needs expand for more than 4 lines', () => {
    assert.equal(feedLyricNeedsExpand('a\nb\nc\nd\ne'), true)
  })

  it('does not need expand for short copy', () => {
    assert.equal(feedLyricNeedsExpand('Short line.'), false)
  })
})
