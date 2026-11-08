import test from 'node:test'
import assert from 'node:assert/strict'
import { echoHitPickKey, echoSongPickKey } from './pick-key.ts'

test('margo hits share the song id with picked songs', () => {
  assert.equal(
    echoHitPickKey({ source: 'margo', margoSongId: 's1', title: 'A', artist: 'B' }),
    echoSongPickKey({ songId: 's1', songTitle: 'A', artistName: 'B' }),
  )
})

test('catalog hits key on title and artist', () => {
  assert.equal(
    echoHitPickKey({ source: 'apple', title: 'A', artist: 'B' }),
    echoSongPickKey({ songId: null, songTitle: 'A', artistName: 'B' }),
  )
})
