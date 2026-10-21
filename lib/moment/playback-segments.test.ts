import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { computePlaybackSegments, GAP_MAX_SEC } from './playback-segments.ts'

function line(
  position: number,
  songId: string,
  start: number,
  end: number,
): { position: number; songId: string; snippetStart: number; snippetEnd: number } {
  return { position, songId, snippetStart: start, snippetEnd: end }
}

describe('computePlaybackSegments', () => {
  it('returns one segment for a single line', () => {
    const segs = computePlaybackSegments([line(0, 's1', 10, 15)])
    assert.equal(segs.length, 1)
    assert.deepEqual(segs[0], { startSec: 10, endSec: 15 })
  })

  it('keeps small inter-line gaps as separate segments (no silent audio inside a range)', () => {
    const segs = computePlaybackSegments([
      line(0, 's1', 10, 14),
      line(1, 's1', 14.5, 18),
      line(2, 's1', 18.2, 22),
    ])
    assert.equal(segs.length, 3)
    assert.deepEqual(segs[0], { startSec: 10, endSec: 14 })
    assert.deepEqual(segs[1], { startSec: 14.5, endSec: 18 })
    assert.deepEqual(segs[2], { startSec: 18.2, endSec: 22 })
    assert.ok(segs[1].startSec - segs[0].endSec <= GAP_MAX_SEC)
  })

  it('merges touching and overlapping lines into one continuous segment', () => {
    const segs = computePlaybackSegments([
      line(0, 's1', 10, 20),
      line(1, 's1', 19, 25),
      line(2, 's1', 25, 30),
    ])
    assert.equal(segs.length, 1)
    assert.deepEqual(segs[0], { startSec: 10, endSec: 30 })
  })

  it('keeps three far-apart lines as three segments in selection order', () => {
    const segs = computePlaybackSegments([
      line(0, 's1', 10, 12),
      line(1, 's1', 30, 32),
      line(2, 's1', 50, 52),
    ])
    assert.equal(segs.length, 3)
    assert.deepEqual(segs[0], { startSec: 10, endSec: 12 })
    assert.deepEqual(segs[1], { startSec: 30, endSec: 32 })
    assert.deepEqual(segs[2], { startSec: 50, endSec: 52 })
  })

  it('sorts by position when timestamps are out of order', () => {
    const segs = computePlaybackSegments([
      line(2, 's1', 50, 52),
      line(0, 's1', 10, 12),
      line(1, 's1', 12, 14),
    ])
    assert.equal(segs.length, 2)
    assert.deepEqual(segs[0], { startSec: 10, endSec: 14 })
    assert.deepEqual(segs[1], { startSec: 50, endSec: 52 })
  })

  it('ignores lines without timestamps', () => {
    const segs = computePlaybackSegments([
      line(0, 's1', 10, 12),
      { position: 1, songId: 's1', snippetStart: null, snippetEnd: null },
      line(2, 's1', 14, 16),
    ])
    assert.equal(segs.length, 2)
    assert.deepEqual(segs[0], { startSec: 10, endSec: 12 })
    assert.deepEqual(segs[1], { startSec: 14, endSec: 16 })
  })

  it('uses first song only when lines reference different songs', () => {
    const segs = computePlaybackSegments([
      line(0, 's1', 10, 12),
      line(1, 's2', 20, 22),
      line(2, 's1', 14, 16),
    ])
    assert.equal(segs.length, 2)
    assert.deepEqual(segs[0], { startSec: 10, endSec: 12 })
    assert.deepEqual(segs[1], { startSec: 14, endSec: 16 })
  })
})
