import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  artistRootPrefix,
  catalogAudioObjectKey,
  promoteStagingObjectKeyParts,
  promoteFinalVideoObjectKey,
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

  it('artist-scoped catalog + promote paths', () => {
    const uid = '063d94b6-9460-43b3-9c4a-91fa8fe9f635'
    const song = '26bd751e-32b1-4835-b772-c28157bcd4b2'
    const queue = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    assert.equal(artistRootPrefix('TryMargo', uid), 'Margo/artists/trymargo-063d94b6')
    const audio = catalogAudioObjectKey('TryMargo', uid, "Je T'Applaudis Mon Ami", song, 'mp3')
    assert.equal(
      audio,
      'Margo/artists/trymargo-063d94b6/audio/je-t-applaudis-mon-ami-26bd751e.mp3',
    )
    const staging = promoteStagingObjectKeyParts('TryMargo', uid, 'Hello World', queue)
    assert.equal(
      staging,
      'Margo/artists/trymargo-063d94b6/promote/staging/hello-world-aaaaaaaa.mp4',
    )
    const finalK = promoteFinalVideoObjectKey('TryMargo', uid, 'Hello World', queue)
    assert.equal(
      finalK,
      'Margo/artists/trymargo-063d94b6/promote/hello-world-aaaaaaaa.mp4',
    )
  })
})
