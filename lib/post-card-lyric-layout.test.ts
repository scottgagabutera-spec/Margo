import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  feedLyricLayoutMode,
  feedLyricNeedsClamp,
} from './post-card-lyric-layout.ts'

describe('feedLyricLayoutMode', () => {
  it('returns hero for single moment, ≤2 lines, ≤80 chars', () => {
    assert.equal(
      feedLyricLayoutMode([{ position: 0, text: 'Short line.' }]),
      'hero',
    )
    assert.equal(
      feedLyricLayoutMode([{ position: 0, text: 'Line one\nLine two' }]),
      'hero',
    )
  })

  it('returns compact for multi-moment posts', () => {
    assert.equal(
      feedLyricLayoutMode([
        { position: 0, text: 'A' },
        { position: 1, text: 'B' },
      ]),
      'compact',
    )
  })

  it('returns compact when more than 2 lines (Dribble-style)', () => {
    const dribble = 'Dribble\nKeep your head up\nCrossover heart\nEvery miss'
    assert.equal(
      feedLyricLayoutMode([{ position: 0, text: dribble }]),
      'compact',
    )
  })

  it('returns compact when over 80 characters even on one line', () => {
    const long = 'a'.repeat(81)
    assert.equal(
      feedLyricLayoutMode([{ position: 0, text: long }]),
      'compact',
    )
  })

  it('returns compact for empty text', () => {
    assert.equal(feedLyricLayoutMode([{ position: 0, text: '   ' }]), 'compact')
  })
})

describe('feedLyricNeedsClamp', () => {
  it('needs clamp for long single-line copy', () => {
    assert.equal(feedLyricNeedsClamp('x'.repeat(181)), true)
  })

  it('needs clamp for more than 4 lines', () => {
    assert.equal(feedLyricNeedsClamp('a\nb\nc\nd\ne'), true)
  })
})
