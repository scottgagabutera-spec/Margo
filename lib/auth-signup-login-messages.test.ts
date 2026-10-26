import assert from 'node:assert/strict'
import test from 'node:test'
import {
  loginErrorMessage,
  loginFailureResponseBody,
  SIGN_IN_UNKNOWN_EMAIL_MESSAGE,
  SIGN_UP_EMAIL_IN_USE_MESSAGE,
  signupEmailInUseMessage,
} from './auth-login-errors.ts'
import { needsOnboarding } from './welcome-needs-onboarding.ts'

test('unknown email sign-in message', () => {
  assert.equal(loginErrorMessage('user_not_found'), SIGN_IN_UNKNOWN_EMAIL_MESSAGE)
  assert.equal(loginFailureResponseBody('user_not_found').error, SIGN_IN_UNKNOWN_EMAIL_MESSAGE)
})

test('existing email sign-up message', () => {
  assert.equal(signupEmailInUseMessage('User already registered'), SIGN_UP_EMAIL_IN_USE_MESSAGE)
})

test('existing account with profile and custom name skips welcome (gate 4)', () => {
  assert.equal(
    needsOnboarding({
      profileReadOk: true,
      settings: { onboarding: { completedAt: '2026-01-01T00:00:00.000Z' } },
      authUserCreatedAt: '2025-06-01T00:00:00.000Z',
      identity: { username: 'scott_music', displayName: 'Scott Music' },
    }),
    false,
  )
})

test('missing consent row repairs via profileReadOk and completedAt gate', () => {
  assert.equal(
    needsOnboarding({
      profileReadOk: false,
      settings: null,
      authUserCreatedAt: '2026-10-27T00:00:00.000Z',
      identity: { username: 'member1', displayName: 'member1' },
    }),
    false,
  )
})
