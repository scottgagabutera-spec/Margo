import assert from 'node:assert/strict'
import test from 'node:test'
import { sanitizeAuthReturnPath } from './auth-return.ts'
import {
  isOAuthTermsCompletionRedirect,
  oauthCallbackClientReturnTo,
} from './oauth-callback-navigation.ts'

test('sanitizeAuthReturnPath strips OAuth terms hand-off (root cause of /feed crash)', () => {
  assert.equal(sanitizeAuthReturnPath('/signin?step=terms'), null)
})

test('oauthCallbackClientReturnTo preserves terms redirect', () => {
  const follow = oauthCallbackClientReturnTo('/signin?step=terms&returnTo=%2Ffeed')
  assert.equal(follow.kind, 'terms')
  if (follow.kind === 'terms') {
    assert.match(follow.href, /step=terms/)
  }
})

test('oauthCallbackClientReturnTo maps app redirect to feed when allowed', () => {
  const follow = oauthCallbackClientReturnTo('/feed')
  assert.equal(follow.kind, 'app')
  if (follow.kind === 'app') assert.equal(follow.returnTo, '/feed')
})

test('future-provider server redirect behaves like Google', () => {
  const google = oauthCallbackClientReturnTo('/signin?step=terms')
  const future = oauthCallbackClientReturnTo('/signin?step=terms')
  assert.deepEqual(google, future)
})

test('isOAuthTermsCompletionRedirect', () => {
  assert.equal(isOAuthTermsCompletionRedirect('/signin?step=terms'), true)
  assert.equal(isOAuthTermsCompletionRedirect('/feed'), false)
})
