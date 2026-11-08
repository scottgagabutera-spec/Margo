import test from 'node:test'
import assert from 'node:assert/strict'
import { buildListeningWeekRows } from './feed-listening-week.ts'
import type { MemoryPublic } from './memory/types.ts'

function listeningMemory(ownerId: string, username: string, createdAt: string): MemoryPublic {
  return {
    id: `m-${ownerId}`,
    ownerProfileId: ownerId,
    ownerUsername: username,
    ownerDisplayName: username,
    ownerAvatarUrl: null,
    title: 'Listening',
    story: null,
    mood: null,
    visibility: 'public',
    showInLyricsFeed: true,
    showDatePublicly: true,
    dateGranularity: 'period',
    dateStart: '2026-11-03',
    dateEnd: '2026-11-09',
    coverUrl: null,
    songCount: 1,
    resonateCount: 0,
    lyricBackCount: 0,
    createdAt,
    songs: [{
      id: 's1',
      position: 0,
      songId: 'song-1',
      songTitle: 'Song',
      artistName: 'Artist',
      lyricExcerpt: null,
      isLyricOnly: false,
      artworkUrl: null,
      audioUrl: 'https://example.com/a.mp3',
    }],
    photos: [],
    viewerResonated: false,
    isOwner: false,
  }
}

test('listening week one row per person with followed first', () => {
  const memories = [
    listeningMemory('b', 'bob', '2026-11-08T10:00:00Z'),
    listeningMemory('a', 'amy', '2026-11-08T09:00:00Z'),
    listeningMemory('a', 'amy-old', '2026-11-07T09:00:00Z'),
  ]
  const rows = buildListeningWeekRows({
    memories,
    followingIds: new Set(['a']),
    max: 5,
    refDate: new Date('2026-11-08T12:00:00Z'),
  })
  assert.equal(rows.length, 2)
  assert.equal(rows[0]?.ownerProfileId, 'a')
  assert.equal(rows[1]?.ownerProfileId, 'b')
})
