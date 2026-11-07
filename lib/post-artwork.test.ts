import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveCatalogArtworkUrl } from './post-artwork.ts'

test('prefers post mirror artwork then catalog join', () => {
  assert.equal(resolveCatalogArtworkUrl('https://mirror', { artwork_url: 'https://song' }), 'https://mirror')
  assert.equal(resolveCatalogArtworkUrl(null, { artwork_url: 'https://song' }), 'https://song')
  assert.equal(resolveCatalogArtworkUrl('', { artwork_url: ' https://song ' }), 'https://song')
})
