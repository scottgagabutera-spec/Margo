import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import type { MargoSearchCategoryResults } from './meilisearch/types.ts'
import {
  hasCrossScopeResultLeak,
  postgresSearchOptionsForScope,
  PRODUCT_SEARCH_SCOPE_IDS,
  scopedResultCounts,
  type ScopeSearchShape,
} from './search-api-scope.ts'

const MOCK: MargoSearchCategoryResults = {
  users: [{ id: 'u1', type: 'user', title: 'Ada', username: 'ada' }],
  lyrics: [{ id: 'l1', type: 'lyric', title: 'line', username: 'ada' }],
  artists: [{ id: 'a1', type: 'artist', title: 'Artist', username: 'art' }],
  catalogLines: [{ id: 'c1', type: 'catalog_line', title: 'moment', username: 'ada' }],
  songs: [{ id: 's1', type: 'song', title: 'Song', username: 'ada' }],
}

function scopeFromSource(scopeId: string): ScopeSearchShape {
  const src = fs.readFileSync('lib/search-scope.ts', 'utf8')
  const block = src.match(new RegExp(`${scopeId}: \\{[\\s\\S]*?\\n  \\},`))
  assert.ok(block, `scope block ${scopeId}`)
  const typesMatch = block![0].match(/types: (\[[^\]]+\])/)
  assert.ok(typesMatch)
  const types = JSON.parse(typesMatch![1].replace(/'/g, '"')) as ScopeSearchShape['types']
  const lyricsRequireSong = /lyricsRequireSong: true/.test(block![0])
  return { id: scopeId, types, lyricsRequireSong: lyricsRequireSong || undefined }
}

for (const scopeId of PRODUCT_SEARCH_SCOPE_IDS) {
  test(`scope ${scopeId}: postgres options honor types and flags`, () => {
    const scope = scopeFromSource(scopeId)
    const opts = postgresSearchOptionsForScope(scope, {
      playlistId: 'pl-1',
      libraryUserId: 'user-1',
    })
    assert.deepEqual(opts.types, scope.types)
    assert.equal(opts.limitPerType, 8)
    if (scopeId === 'playlist') {
      assert.equal(opts.restrictToPlaylist, true)
      assert.equal(opts.playlistId, 'pl-1')
    }
    if (scopeId === 'library') {
      assert.equal(opts.restrictToLibrary, true)
      assert.equal(opts.libraryUserId, 'user-1')
    }
    if (scopeId === 'resonance') {
      assert.equal(opts.lyricsRequireSong, true)
    }
  })

  test(`scope ${scopeId}: render counts exclude out-of-scope buckets`, () => {
    const scope = scopeFromSource(scopeId)
    const counts = scopedResultCounts(scope, MOCK)
    for (const [bucket, count] of Object.entries(counts)) {
      const inScope =
        (bucket === 'users' && scope.types.includes('user'))
        || (bucket === 'lyrics' && scope.types.includes('lyric'))
        || (bucket === 'artists' && scope.types.includes('artist'))
        || (bucket === 'catalogLines' && scope.types.includes('catalog_line'))
        || (bucket === 'songs' && scope.types.includes('song'))
      if (inScope) assert.ok(count > 0)
      else assert.equal(count, 0)
    }
  })
}

test('moments scope only catalog_line type in API request', () => {
  const scope = scopeFromSource('moments')
  assert.deepEqual(scope.types, ['catalog_line'])
})

test('artists scope only artist type in API request', () => {
  const scope = scopeFromSource('artists')
  assert.deepEqual(scope.types, ['artist'])
})

test('songs scope allows song and artist only', () => {
  const scope = scopeFromSource('songs')
  assert.deepEqual(scope.types, ['song', 'artist'])
})

test('API route uses postgres fallback helper', () => {
  const route = fs.readFileSync('app/api/search/route.ts', 'utf8')
  assert.match(route, /postgresSearchOptionsForScope/)
  assert.match(route, /searchPostgresFallback/)
  assert.doesNotMatch(route, /meilisearch.*search\(/i)
})

test('cross-scope leak detector flags wrong buckets', () => {
  const moments = scopeFromSource('moments')
  assert.equal(hasCrossScopeResultLeak(moments, MOCK), true)
  const onlyLines: MargoSearchCategoryResults = {
    users: [],
    lyrics: [],
    artists: [],
    catalogLines: MOCK.catalogLines,
    songs: [],
  }
  assert.equal(hasCrossScopeResultLeak(moments, onlyLines), false)
})

test('search page empty copy', () => {
  const page = fs.readFileSync('app/search/page.tsx', 'utf8')
  assert.match(page, /Nothing here yet/)
})
