import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { classifyLoginError, loginErrorMessage } from './auth-login-errors.ts'

describe('auth login errors', () => {
  it('classifies email not confirmed separately from invalid credentials', () => {
    assert.equal(classifyLoginError('Email not confirmed'), 'email_not_confirmed')
    assert.equal(classifyLoginError('Invalid login credentials'), 'invalid_credentials')
  })

  it('uses short messages', () => {
    assert.equal(loginErrorMessage('email_not_confirmed'), 'Confirm your email first.')
    assert.equal(loginErrorMessage('invalid_credentials'), 'Incorrect email or password.')
  })
})
