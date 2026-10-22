import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { LyricMoment } from './lyric-moments-board.ts'
import {
  buildShortsShelfClips,
  computeMaxPerArtist,
  meetsShortsMinimum,
  pickDailyMomentForSong,
  rotateShortsBatch,
  stableHash32,
  SHORTS_BATCH_SIZE,
  SHORTS_MIN_ELIGIBLE_SONGS,
  artistKeyForClip,
} from './shorts-shelf-rotation.ts'

function moment(songId: string, artist: string, lineId: number): LyricMoment {
  return {
    line: 'test line here enough words',
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

function dailyClipsForArtists(artistCount: number, songsPerArtist: number): LyricMoment[] {
  const out: LyricMoment[] = []
  for (let a = 0; a < artistCount; a++) {
    for (let s = 0; s < songsPerArtist; s++) {
      out.push(moment(`a${a}-s${s}`, `Artist ${a}`, s))
    }
  }
  return out
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
  })

  it('computeMaxPerArtist: single artist allows 20', () => {
    assert.equal(computeMaxPerArtist(1), SHORTS_BATCH_SIZE)
    assert.equal(computeMaxPerArtist(5), 2)
    assert.equal(computeMaxPerArtist(50), 1)
  })

  it('round-robin with 1 artist fills up to batch size', () => {
    const daily = dailyClipsForArtists(1, 25)
    const batch = rotateShortsBatch(daily, 42, { batchSize: 20 })
    assert.equal(batch.length, 20)
    assert.equal(new Set(batch.map(artistKeyForClip)).size, 1)
  })

  it('round-robin with 5 artists spreads evenly in first round', () => {
    const daily = dailyClipsForArtists(5, 8)
    const batch = rotateShortsBatch(daily, 7, { batchSize: 20 })
    const artists = new Set(batch.map(artistKeyForClip))
    assert.equal(artists.size, 5)
    for (const a of artists) {
      const n = batch.filter((c) => artistKeyForClip(c) === a).length
      assert.ok(n <= 2)
      assert.ok(n >= 1)
    }
  })

  it('round-robin with 50 artists yields 20 distinct artists', () => {
    const daily = dailyClipsForArtists(50, 2)
    const batch = rotateShortsBatch(daily, 99, { batchSize: 20 })
    assert.equal(batch.length, 20)
    assert.equal(new Set(batch.map(artistKeyForClip)).size, 20)
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
