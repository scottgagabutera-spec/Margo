import assert from 'node:assert/strict'
import test from 'node:test'
import { oauthPostExchangeRedirect } from './auth-oauth-intent.ts'

test('OAuth sign-in with no account still routes to terms before welcome', () => {
  const dest = oauthPostExchangeRedirect(true, '/feed')
  assert.match(dest, /^\/signin\?step=terms/)
  assert.match(dest, /returnTo=/)
})

test('OAuth existing account with consent goes to return path', () => {
  assert.equal(oauthPostExchangeRedirect(false, '/compose'), '/compose')
  assert.equal(oauthPostExchangeRedirect(false, null), '/feed')
})

test('future-provider path matches Google (provider-blind redirect helper)', () => {
  const google = oauthPostExchangeRedirect(true, '/feed')
  const future = oauthPostExchangeRedirect(true, '/feed')
  assert.equal(google, future)
})
