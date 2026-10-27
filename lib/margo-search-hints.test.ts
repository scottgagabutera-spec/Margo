import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import {
  MARGO_SEARCH_HINT_ARTISTS,
  MARGO_SEARCH_HINT_CATALOG,
  MARGO_SEARCH_HINT_FEED,
  MARGO_SEARCH_HINT_LIBRARY,
  MARGO_SEARCH_HINT_MOMENTS,
  MARGO_SEARCH_HINT_PEOPLE,
  MARGO_SEARCH_HINT_PLAYLIST,
  MARGO_SEARCH_HINT_RESONANCE,
  MARGO_SEARCH_HINT_SONGS,
  margoSearchHintForScopeId,
} from './margo-search-hints.ts'

test('scope hints use approved copy', () => {
  assert.equal(margoSearchHintForScopeId('discover'), MARGO_SEARCH_HINT_CATALOG)
  assert.equal(margoSearchHintForScopeId('songs'), MARGO_SEARCH_HINT_SONGS)
  assert.equal(margoSearchHintForScopeId('moments'), MARGO_SEARCH_HINT_MOMENTS)
  assert.equal(margoSearchHintForScopeId('artists'), MARGO_SEARCH_HINT_ARTISTS)
  assert.equal(margoSearchHintForScopeId('resonance'), MARGO_SEARCH_HINT_RESONANCE)
  assert.equal(margoSearchHintForScopeId('feed'), MARGO_SEARCH_HINT_FEED)
  assert.equal(margoSearchHintForScopeId('hub'), MARGO_SEARCH_HINT_PEOPLE)
  assert.equal(margoSearchHintForScopeId('people'), MARGO_SEARCH_HINT_PEOPLE)
  assert.equal(margoSearchHintForScopeId('library'), MARGO_SEARCH_HINT_LIBRARY)
  assert.equal(margoSearchHintForScopeId('playlist'), MARGO_SEARCH_HINT_PLAYLIST)
  assert.equal(MARGO_SEARCH_HINT_CATALOG, 'Search song, artist, lyrics')
})

const BANNED_PLACEHOLDER_FRAGMENTS = [
  'Song, artist, or lyric',
  'Search Margo, Genius, or Apple Music',
  'Search by lyric, song or artist',
  'Search by name or @username',
  'rotatingHints',
  'catalogHints',
  'depth-search-hints',
  'DEPTH_HINT_ROTATE_MS',
]

function walkTsFiles(dir: string, out: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = fs.statSync(full)
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === '.next') continue
      walkTsFiles(full, out)
      continue
    }
    if (/\.(tsx|ts)$/.test(name)) out.push(full)
  }
  return out
}

test('no legacy search placeholders or hint modes remain in app code', () => {
  const root = process.cwd()
  const files = walkTsFiles(root).filter((f) => {
    if (f.includes(`${path.sep}app${path.sep}admin${path.sep}`)) return false
    if (f.endsWith('.test.ts')) return false
    return true
  })
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8')
    for (const frag of BANNED_PLACEHOLDER_FRAGMENTS) {
      assert.doesNotMatch(
        text,
        new RegExp(frag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        `${file} must not contain ${frag}`,
      )
    }
  }
})

test('MargoSearchInput call sites pass hintText', () => {
  const files = [
    'app/search/page.tsx',
    'app/compose/page.tsx',
    'components/messages-inbox.tsx',
    'components/library-page-body.tsx',
    'components/compose-send-to.tsx',
    'components/lyric-back-panel-compose.tsx',
    'components/signature-song-picker.tsx',
    'components/stage/stage-landing.tsx',
  ]
  for (const rel of files) {
    const text = fs.readFileSync(rel, 'utf8')
    assert.match(text, /<MargoSearchInput[\s\S]*?hintText=/, `${rel} must use hintText on MargoSearchInput`)
  }
})
