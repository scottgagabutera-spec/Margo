import assert from 'node:assert/strict'
import test from 'node:test'
import { memoryDisplayCaption, memoryCoverIsSongArt } from './display-caption.ts'
import type { MemoryPublic } from './types.ts'

function base(over: Partial<MemoryPublic>): MemoryPublic {
  return {
    id: 'm1',
    ownerProfileId: 'u1',
    ownerUsername: 'a',
    ownerDisplayName: 'A',
    ownerAvatarUrl: null,
    title: '1 song',
    story: null,
    mood: null,
    visibility: 'public',
    showInLyricsFeed: true,
    showDatePublicly: true,
    dateGranularity: 'none',
    dateStart: null,
    dateEnd: null,
    coverUrl: 'https://example.com/c.jpg',
    songCount: 1,
    resonateCount: 0,
    lyricBackCount: 0,
    createdAt: new Date().toISOString(),
    songs: [{ id: 's1', position: 0, songId: 'x', songTitle: 'Blue Lines', artistName: 'Margo', lyricExcerpt: null, isLyricOnly: false, artworkUrl: null, audioUrl: null }],
    photos: [],
    viewerResonated: false,
    isOwner: false,
    ...over,
  }
}

test('memoryDisplayCaption prefers real title', () => {
  assert.equal(memoryDisplayCaption(base({ title: 'Summer road trip' })), 'Summer road trip')
})

test('memoryCaptionTitle uses story when title is placeholder', () => {
  assert.equal(memoryDisplayCaption(base({ title: '1 song', story: 'We danced' })), 'We danced · Margo')
})

test('memoryDisplayCaption falls back to song title', () => {
  assert.equal(memoryDisplayCaption(base({ title: '1 song', story: null })), 'Blue Lines')
})

test('memoryCoverIsSongArt when no photos', () => {
  assert.equal(memoryCoverIsSongArt(base({ photos: [] })), true)
  assert.equal(memoryCoverIsSongArt(base({ photos: [{ id: 'p', position: 0, url: 'u', width: 1, height: 1, mediaType: 'image', posterUrl: null, durationSec: null }] })), false)
})
