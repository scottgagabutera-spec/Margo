import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

test('genius route uses parallel external fetch helper and cache headers', () => {
  const route = fs.readFileSync('app/api/genius/route.ts', 'utf8')
  assert.match(route, /fetchExternalSongHits/)
  assert.match(route, /s-maxage=30/)
  assert.match(route, /trimExternalSongHit/)
})

test('genius external search uses per-call timeout', () => {
  const src = fs.readFileSync('lib/genius-external-search.ts', 'utf8')
  assert.match(src, /fetchWithTimeout/)
  assert.match(src, /GENIUS_EXTERNAL_TIMEOUT_MS = 1500/)
  assert.match(src, /Promise.allSettled/)
})
