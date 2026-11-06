import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  catalogArtistFolderSegment,
  catalogFileBaseName,
  slugifySegment,
  shortId8FromUuid,
} from './r2-object-naming.ts'

describe('r2 object naming', () => {
  it('slugifySegment strips non-ascii and caps length', () => {
    assert.equal(slugifySegment("Café L'été!"), 'cafe-l-ete')
    assert.equal(slugifySegment('a'.repeat(50)).length, 40)
  })

  it('shortId8FromUuid returns first 8 hex chars', () => {
    assert.equal(
      shortId8FromUuid('26bd751e-32b1-4835-b772-c28157bcd4b2'),
      '26bd751e',
    )
  })

  it('catalog paths match artist folder + file pattern', () => {
    const uid = '063d94b6-9460-43b3-9c4a-91fa8fe9f635'
    const song = '26bd751e-32b1-4835-b772-c28157bcd4b2'
    const folder = catalogArtistFolderSegment('TryMargo', uid)
    assert.equal(folder, `trymargo-${shortId8FromUuid(uid)}`)
    const file = catalogFileBaseName("Je T'Applaudis Mon Ami", song, 'mp3')
    assert.match(file, /^je-t-applaudis-mon-ami-26bd751e\.mp3$/)
  })
})
