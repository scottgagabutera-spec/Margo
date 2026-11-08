import test from 'node:test'
import assert from 'node:assert/strict'
import { filterEchoRows, formatAnswerCount, topEchoSongs } from './set-list.ts'
import type { EchoAnswerRow } from './types.ts'

function row(name: string, songs: [string, string][]): EchoAnswerRow {
  return {
    answerId: name,
    profileId: name,
    username: name.toLowerCase(),
    displayName: name,
    avatarUrl: null,
    timeChoice: 'this_week',
    timeLabel: 'This week',
    songLine: '',
    isOwn: false,
    payload: {
      songs: songs.map(([songTitle, artistName]) => ({
        songId: null,
        songTitle,
        artistName,
        artworkUrl: null,
        audioUrl: null,
        isLyricOnly: true,
      })),
    },
  }
}

test('filter matches people and songs', () => {
  const rows = [row('Ama', [['Moon', 'Kofi']]), row('Kwe', [['Sun', 'Ama']])]
  assert.equal(filterEchoRows(rows, 'ama').length, 2)
  assert.equal(filterEchoRows(rows, 'moon').length, 1)
  assert.equal(filterEchoRows(rows, '').length, 2)
})

test('top songs count people not repeats', () => {
  const rows = [row('Ama', [['Moon', 'Kofi'], ['Moon', 'Kofi']]), row('Kwe', [['Moon', 'Kofi']])]
  assert.deepEqual(topEchoSongs(rows), [{ title: 'Moon', artist: 'Kofi', count: 2 }])
})

test('answer count formats thousands', () => {
  assert.equal(formatAnswerCount(10000), '10,000 answers')
  assert.equal(formatAnswerCount(1), '1 answer')
})
