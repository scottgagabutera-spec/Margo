import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  classifyLoginError,
  classifyLoginErrorFromSupabase,
  loginErrorMessage,
  loginFailureResponseBody,
  SIGN_IN_NEUTRAL_MESSAGE,
} from './auth-login-errors.ts'

/** Shapes auth-js builds from GoTrue JSON (`msg` → AuthApiError.message, `code` → .code). */
const GOTRUE_SHAPES = [
  { message: 'Invalid login credentials', code: 'invalid_credentials' },
  { message: 'Invalid credentials', code: 'invalid_credentials' },
  { message: 'Email not confirmed', code: 'email_not_confirmed' },
  { message: 'User not found', code: 'user_not_found' },
] as const

describe('auth login errors', () => {
  it('classifies real GoTrue code + message pairs from auth-js', () => {
    assert.equal(classifyLoginError('Invalid login credentials', 'invalid_credentials'), 'invalid_credentials')
    assert.equal(classifyLoginError('Invalid credentials', 'invalid_credentials'), 'invalid_credentials')
    assert.equal(classifyLoginError('Email not confirmed', 'email_not_confirmed'), 'email_not_confirmed')
    assert.equal(classifyLoginError('User not found', 'user_not_found'), 'user_not_found')
  })

  it('uses one neutral user message for every classified sign-in failure', () => {
    for (const shape of GOTRUE_SHAPES) {
      const code = classifyLoginErrorFromSupabase(shape)
      assert.equal(loginErrorMessage(code), SIGN_IN_NEUTRAL_MESSAGE)
    }
    assert.equal(loginErrorMessage('unknown'), SIGN_IN_NEUTRAL_MESSAGE)
  })

  it('loginFailureResponseBody does not leak error codes', () => {
    const body = loginFailureResponseBody()
    assert.equal(body.error, SIGN_IN_NEUTRAL_MESSAGE)
    assert.equal('code' in body, false)
  })
})
