import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { compactArtworkUrl } from './compact-artwork-url.ts'

describe('compactArtworkUrl', () => {
  it('shrinks Apple Music artwork tokens', () => {
    assert.equal(
      compactArtworkUrl('https://is1-ssl.mzstatic.com/image/thumb/Music/x/100x100bb.jpg', 64),
      'https://is1-ssl.mzstatic.com/image/thumb/Music/x/64x64bb.jpg',
    )
  })

  it('returns empty for missing art', () => {
    assert.equal(compactArtworkUrl(''), '')
    assert.equal(compactArtworkUrl(null), '')
  })
})
