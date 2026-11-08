import assert from 'node:assert/strict'
import test from 'node:test'
import { echoExtraSongLabel, echoPrimarySong } from './answer-song-display.ts'

test('echoPrimarySong returns first song', () => {
  const song = echoPrimarySong({
    songs: [
      { songId: '1', songTitle: 'Elegance', artistName: 'Travis', artworkUrl: null, audioUrl: null, isLyricOnly: true },
    ],
  })
  assert.equal(song?.songTitle, 'Elegance')
})

test('echoExtraSongLabel formats plus count', () => {
  assert.equal(
    echoExtraSongLabel({
      songs: [
        { songId: null, songTitle: 'A', artistName: 'X', artworkUrl: null, audioUrl: null, isLyricOnly: true },
        { songId: null, songTitle: 'B', artistName: 'Y', artworkUrl: null, audioUrl: null, isLyricOnly: true },
        { songId: null, songTitle: 'C', artistName: 'Z', artworkUrl: null, audioUrl: null, isLyricOnly: true },
      ],
    }),
    'Plus 2 more',
  )
})
