import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { LyricMoment } from './lyric-moments-board.ts'
import {
  buildShortsShelfClips,
  meetsShortsMinimum,
  pickDailyMomentForSong,
  rotateShortsBatch,
  stableHash32,
  SHORTS_MIN_ELIGIBLE_SONGS,
} from './shorts-shelf-rotation.ts'

function moment(songId: string, artist: string, lineId: number): LyricMoment {
  return {
    line: 'test line here',
    start: 0,
    end: 3,
    lineId,
    songId,
    songTitle: `Title ${songId}`,
    artist,
    audioUrl: 'https://example.com/a.mp3',
    vibes: ['HOPE'],
  }
}

describe('shorts shelf rotation', () => {
  it('stableHash32 is deterministic', () => {
    assert.equal(stableHash32('a'), stableHash32('a'))
    assert.notEqual(stableHash32('a'), stableHash32('b'))
  })

  it('pickDailyMomentForSong is stable for same day', () => {
    const pool = [moment('s1', 'A', 0), moment('s1', 'A', 1)]
    const a = pickDailyMomentForSong('s1', pool, '2026-10-22')
    const b = pickDailyMomentForSong('s1', pool, '2026-10-22')
    assert.equal(a?.lineId, b?.lineId)
    const c = pickDailyMomentForSong('s1', pool, '2026-10-23')
    assert.ok(a && c)
  })

  it('rotateShortsBatch caps at two per artist', () => {
    const clips = [
      moment('s1', 'Same Artist', 0),
      moment('s2', 'Same Artist', 0),
      moment('s3', 'Same Artist', 0),
      moment('s4', 'Other', 0),
    ]
    const batch = rotateShortsBatch(clips, 100, { batchSize: 10, maxPerArtist: 2 })
    const same = batch.filter((c) => c.artist === 'Same Artist')
    assert.ok(same.length <= 2)
    assert.ok(batch.length >= 3)
  })

  it('meetsShortsMinimum', () => {
    assert.equal(meetsShortsMinimum(4), false)
    assert.equal(meetsShortsMinimum(5), true)
    assert.equal(meetsShortsMinimum(SHORTS_MIN_ELIGIBLE_SONGS), true)
  })

  it('buildShortsShelfClips returns empty when below minimum', () => {
    const moments = Array.from({ length: 4 }, (_, i) => moment(`s${i}`, `A${i}`, 0))
    const { clips, meetsMinimum, eligibleSongCount } = buildShortsShelfClips(
      moments,
      new Date('2026-10-22T12:00:00Z'),
    )
    assert.equal(eligibleSongCount, 4)
    assert.equal(meetsMinimum, false)
    assert.equal(clips.length, 0)
  })
})
