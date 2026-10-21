import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  isLikelyFragment,
  validateCuratedMoments,
  wordCount,
} from './validate-curated-moments.logic.ts'
import type { CuratedMomentDraft, SongLyricLineInput } from './curated-types.ts'
import { computeLyricsChecksum } from './lyrics-checksum.ts'

function linesFromSpec(spec: Array<[number, string, number, number]>): SongLyricLineInput[] {
  return spec.map(([lineIndex, text, startSec, endSec]) => ({
    lineIndex,
    text,
    startSec,
    endSec,
  }))
}

function draft(start: number, end: number, reason = 'Strong hook'): CuratedMomentDraft {
  return {
    startLineIndex: start,
    endLineIndex: end,
    reason,
    primaryVibe: 'HOPE',
    confidence: 0.9,
  }
}

describe('validateCuratedMoments', () => {
  const baseLines = linesFromSpec([
    [0, 'First line of thought here', 0, 4],
    [1, 'Second line continues well', 4, 8],
    [2, 'Third line closes the hook', 8, 12],
    [3, 'Fourth line adds depth now', 12, 16],
  ])

  it('rejects missing line indexes', () => {
    const result = validateCuratedMoments([draft(0, 9)], baseLines)
    assert.equal(result.ok, false)
  })

  it('rejects spans that reference missing line indexes', () => {
    const lines = linesFromSpec([
      [0, 'One two three four five', 0, 8],
      [2, 'Six seven eight nine ten', 10, 18],
    ])
    const result = validateCuratedMoments([draft(0, 1)], lines)
    assert.equal(result.ok, false)
  })

  it('rejects too-short duration', () => {
    const lines = linesFromSpec([
      [0, 'One two three four five', 0, 1],
      [1, 'Six seven eight nine ten', 1, 2],
    ])
    const result = validateCuratedMoments([draft(0, 1)], lines)
    assert.equal(result.ok, false)
  })

  it('rejects too-long duration', () => {
    const lines = linesFromSpec([
      [0, 'One two three four five', 0, 20],
      [1, 'Six seven eight nine ten', 20, 40],
    ])
    const result = validateCuratedMoments([draft(0, 1)], lines)
    assert.equal(result.ok, false)
  })

  it('rejects duplicate ranges', () => {
    const result = validateCuratedMoments([draft(0, 1), draft(0, 1)], baseLines)
    assert.equal(result.ok, false)
  })

  it('rejects heavy overlap', () => {
    const result = validateCuratedMoments([draft(0, 2), draft(1, 3)], baseLines)
    assert.equal(result.ok, false)
  })

  it('rejects mid-sentence fragments', () => {
    assert.equal(isLikelyFragment('and then I went to'), true)
    const lines = linesFromSpec([
      [0, 'We drove all night through rain', 0, 8],
      [1, 'and then I went to', 8, 16],
    ])
    const result = validateCuratedMoments([draft(0, 1)], lines)
    assert.equal(result.ok, false)
  })

  it('rejects empty lyrics input', () => {
    const result = validateCuratedMoments([draft(0, 1)], [])
    assert.equal(result.ok, false)
  })

  it('accepts a valid two-line moment', () => {
    const result = validateCuratedMoments([draft(0, 1)], baseLines)
    assert.equal(result.ok, true)
    if (result.ok) {
      assert.ok(wordCount(result.moments[0].text) >= 5)
      assert.ok(result.moments[0].endSec - result.moments[0].startSec >= 6)
    }
  })
})

describe('computeLyricsChecksum', () => {
  it('changes when lyric text changes', () => {
    const a = computeLyricsChecksum([{ lineIndex: 0, text: 'Hello world', startSec: 0, endSec: 1 }])
    const b = computeLyricsChecksum([{ lineIndex: 0, text: 'Hello worlds', startSec: 0, endSec: 1 }])
    assert.notEqual(a, b)
  })

  it('is stable for the same ordered lines', () => {
    const lines = [
      { lineIndex: 1, text: 'B', startSec: 1, endSec: 2 },
      { lineIndex: 0, text: 'A', startSec: 0, endSec: 1 },
    ]
    assert.equal(computeLyricsChecksum(lines), computeLyricsChecksum(lines))
  })
})
