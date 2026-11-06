import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { promoteStagingObjectKey, legacyFlatPromoteStagingKey } from './promote-staging-path.ts'

describe('promote staging object key', () => {
  it('legacy flat key matches previous layout', () => {
    const uid = '063d94b6-9460-43b3-9c4a-91fa8fe9f635'
    const qid = '26bd751e-32b1-4835-b772-c28157bcd4b2'
    const key = legacyFlatPromoteStagingKey(uid, qid)
    assert.equal(key, 'Margo/promote/staging/063d94b6-9460-43b3-9c4a-91fa8fe9f635/26bd751e-32b1-4835-b772-c28157bcd4b2.mp4')
  })

  it('readable key uses artist + title when provided', () => {
    const uid = '063d94b6-9460-43b3-9c4a-91fa8fe9f635'
    const qid = '26bd751e-32b1-4835-b772-c28157bcd4b2'
    const key = promoteStagingObjectKey({
      profileId: uid,
      queueId: qid,
      artistSlug: 'TryMargo',
      songTitle: 'Hello World',
    })
    assert.equal(
      key,
      'Margo/promote/staging/trymargo-063d94b6/hello-world-26bd751e.mp4',
    )
  })
})
