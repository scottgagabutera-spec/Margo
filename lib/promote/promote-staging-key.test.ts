import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { promoteStagingObjectKey } from './promote-staging-path.ts'

describe('promote staging object key', () => {
  it('is scoped to user id and queue id under Margo/promote/staging', () => {
    const uid = 'user-uuid-1234'
    const qid = 'queue-uuid-5678'
    const key = promoteStagingObjectKey(uid, qid)
    assert.equal(key, 'Margo/promote/staging/user-uuid-1234/queue-uuid-5678.mp4')
  })
})
