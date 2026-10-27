import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DISCOVER_VM_CONTROLS,
  filterMomentsByVibe,
  filterPostsByVibe,
  sortArtistsCatalog,
  sortSongsCatalog,
  countSongsByOwnerProfile,
} from './discover-view-more-logic.ts'
import type { LyricMoment } from './lyric-moments-board.ts'

function moment(vibes: string[]): LyricMoment {
  return {
    line: 'test line',
    start: 0,
    end: 1,
    lineId: 0,
    songId: 's1',
    songTitle: 'T',
    artist: 'A',
    vibes,
  }
}

test('controls guard: only listed controls per page', () => {
  assert.deepEqual(DISCOVER_VM_CONTROLS.moments, ['vibe-chips'])
  assert.deepEqual(DISCOVER_VM_CONTROLS.songs, ['vibe-chips', 'sort-segment'])
  assert.deepEqual(DISCOVER_VM_CONTROLS.resonance, ['vibe-chips'])
  assert.deepEqual(DISCOVER_VM_CONTROLS.artists, [])
})

test('moments Hope filter and ALL restore', () => {
  const pool = [moment(['HOPE']), moment(['CHILL']), moment(['HOPE', 'JOY'])]
  const hope = filterMomentsByVibe(pool, 'HOPE')
  assert.equal(hope.length, 2)
  assert.equal(filterMomentsByVibe(pool, 'ALL').length, 3)
})

test('songs sort modes change order', () => {
  const songs = [
    { id: 'a', title: 'Zed', plays: 1, resonates: 0, lyricUses: 100 },
    { id: 'b', title: 'Alpha', plays: 500, resonates: 0, lyricUses: 1 },
    { id: 'c', title: 'Mid', plays: 10, resonates: 10, lyricUses: 50 },
  ]
  const trending = sortSongsCatalog(songs, 'trending')
  assert.equal(trending[0].id, 'b')
  const top = sortSongsCatalog(songs, 'top')
  assert.equal(top[0].id, 'a')
  const az = sortSongsCatalog(songs, 'az')
  assert.equal(az[0].title, 'Alpha')
})

test('artists sorted A–Z by display name then username', () => {
  const sorted = sortArtistsCatalog([
    { id: '2', username: 'zee', displayName: 'Zara', avatarUrl: null, artistStatus: null },
    { id: '1', username: 'amy', displayName: 'Amy', avatarUrl: null, artistStatus: null },
  ])
  assert.equal(sorted[0].displayName, 'Amy')
})

test('artist song counts use owner_profile_id rows', () => {
  const map = countSongsByOwnerProfile([
    { owner_profile_id: 'p1' },
    { owner_profile_id: 'p1' },
    { owner_profile_id: 'p2' },
    { owner_profile_id: null },
  ])
  assert.equal(map.get('p1'), 2)
  assert.equal(map.get('p2'), 1)
})

test('resonance vibe filter uses post emotion', () => {
  const posts = [
    { id: '1', songId: 's', text: 'x', emotion: 'HOPE' },
    { id: '2', songId: 's', text: 'y', emotion: 'CHILL' },
  ]
  assert.equal(filterPostsByVibe(posts as never, 'HOPE').length, 1)
})
