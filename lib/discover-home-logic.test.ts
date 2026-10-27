import assert from 'node:assert/strict'
import test from 'node:test'
import { capDiscoverHomeSongs, lyricMomentsStableKey } from './discover-home-logic.ts'

test('capDiscoverHomeSongs limits row to 12', () => {
  const songs = Array.from({ length: 20 }, (_, i) => ({ id: String(i), title: `t${i}`, artist: 'a', lyricLines: [] }))
  assert.equal(capDiscoverHomeSongs(songs as never).length, 12)
})

test('lyricMomentsStableKey stable for same rows', () => {
  const rows = [
    { songId: 'a', lineIndex: 1, text: 'x', startSec: 0, endSec: 1, vibes: ['HOPE'], songTitle: 'T', artist: 'A' },
    { songId: 'b', lineIndex: 2, text: 'y', startSec: 0, endSec: 1, vibes: ['CHILL'], songTitle: 'T', artist: 'A' },
  ]
  const k1 = lyricMomentsStableKey(rows as never)
  const k2 = lyricMomentsStableKey([...rows].reverse() as never)
  assert.equal(k1, k2)
})
