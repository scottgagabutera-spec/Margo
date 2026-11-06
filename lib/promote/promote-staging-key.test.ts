import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { promoteStagingObjectKey } from './promote-staging-path.ts'
import {
  legacyPromoteStagingFlatKey,
  legacyPromoteStagingReadableKey,
} from '../r2/r2-object-naming.ts'

describe('promote staging object key', () => {
  it('legacy flat key still defined', () => {
    const uid = '063d94b6-9460-43b3-9c4a-91fa8fe9f635'
    const qid = '26bd751e-32b1-4835-b772-c28157bcd4b2'
    assert.equal(
      legacyPromoteStagingFlatKey(uid, qid),
      'Margo/promote/staging/063d94b6-9460-43b3-9c4a-91fa8fe9f635/26bd751e-32b1-4835-b772-c28157bcd4b2.mp4',
    )
  })

  it('legacy intermediate readable key', () => {
    const uid = '063d94b6-9460-43b3-9c4a-91fa8fe9f635'
    const qid = '26bd751e-32b1-4835-b772-c28157bcd4b2'
    assert.equal(
      legacyPromoteStagingReadableKey('TryMargo', uid, 'Hello World', qid),
      'Margo/promote/staging/trymargo-063d94b6/hello-world-26bd751e.mp4',
    )
  })

  it('artist-scoped staging under Margo/artists/.../promote/staging/', () => {
    const uid = '063d94b6-9460-43b3-9c4a-91fa8fe9f635'
    const qid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    const key = promoteStagingObjectKey({
      profileId: uid,
      queueId: qid,
      artistSlug: 'TryMargo',
      songTitle: 'Hello World',
    })
    assert.equal(
      key,
      'Margo/artists/trymargo-063d94b6/promote/staging/hello-world-aaaaaaaa.mp4',
    )
  })
})
