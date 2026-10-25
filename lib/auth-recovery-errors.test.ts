import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  classifyRecoveryUrlError,
  classifyVerifyOtpError,
  recoveryUrlErrorMessage,
  recoveryVerifyErrorMessage,
  resolveInitialRecoveryPhase,
  shouldEnableContinueButton,
} from './auth-recovery-errors.ts'

describe('classifyRecoveryUrlError', () => {
  it('maps otp_expired', () => {
    assert.equal(classifyRecoveryUrlError(null, 'otp_expired', null), 'expired')
    assert.equal(recoveryUrlErrorMessage('expired'), 'This link expired.')
  })

  it('maps already used', () => {
    assert.equal(
      classifyRecoveryUrlError('access_denied', null, 'Email link is invalid or has already been used'),
      'already_used',
    )
  })

  it('maps invalid', () => {
    assert.equal(classifyRecoveryUrlError('invalid_request', 'validation_failed', null), 'invalid')
  })
})

describe('classifyVerifyOtpError', () => {
  it('maps expired otp', () => {
    assert.equal(classifyVerifyOtpError({ code: 'otp_expired', message: 'Token has expired' }), 'expired')
    assert.equal(recoveryVerifyErrorMessage('expired'), 'That code expired.')
  })

  it('maps invalid code', () => {
    assert.equal(classifyVerifyOtpError({ code: 'invalid_otp', message: 'Invalid token' }), 'invalid')
  })

  it('maps wrong email shape', () => {
    assert.equal(classifyVerifyOtpError({ message: 'Token has expired or is invalid' }), 'invalid')
  })
})

describe('recovery flow phase', () => {
  it('continue when token_hash present', () => {
    assert.equal(
      resolveInitialRecoveryPhase({
        urlErrorKind: null,
        tokenHash: 'abc',
        recoveryType: 'recovery',
        preferCode: false,
      }),
      'continue',
    )
    assert.equal(shouldEnableContinueButton('abc', 'recovery'), true)
  })

  it('url error wins', () => {
    assert.equal(
      resolveInitialRecoveryPhase({
        urlErrorKind: 'expired',
        tokenHash: 'abc',
        recoveryType: 'recovery',
        preferCode: false,
      }),
      'url_error',
    )
  })

  it('code path when no token', () => {
    assert.equal(
      resolveInitialRecoveryPhase({
        urlErrorKind: null,
        tokenHash: null,
        recoveryType: null,
        preferCode: false,
      }),
      'code',
    )
  })
})
