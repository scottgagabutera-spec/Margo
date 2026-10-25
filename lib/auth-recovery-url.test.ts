import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mergeAuthCallbackParams, recoveryTypeFromParams } from './auth-recovery-url.ts'

describe('mergeAuthCallbackParams', () => {
  it('reads token_hash from query', () => {
    const p = mergeAuthCallbackParams('?token_hash=th&type=recovery', '')
    assert.equal(p.token_hash, 'th')
    assert.equal(p.type, 'recovery')
  })

  it('reads errors from hash', () => {
    const p = mergeAuthCallbackParams('', '#error=access_denied&error_code=otp_expired')
    assert.equal(p.error, 'access_denied')
    assert.equal(p.error_code, 'otp_expired')
  })

  it('hash overrides query', () => {
    const p = mergeAuthCallbackParams('?token_hash=a', '#token_hash=b')
    assert.equal(p.token_hash, 'b')
  })
})

describe('recoveryTypeFromParams', () => {
  it('accepts recovery only', () => {
    assert.equal(recoveryTypeFromParams('recovery'), 'recovery')
    assert.equal(recoveryTypeFromParams('email'), null)
  })
})
