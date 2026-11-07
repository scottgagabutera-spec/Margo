import assert from 'node:assert/strict'
import test from 'node:test'
import { resolvePostAuthNavigation } from './welcome-needs-onboarding.ts'
import { shouldProxyRedirectAdminFromConsumerPage } from './admin-operator-routes.ts'

test('admin operator post-auth always lands on /admin', () => {
  const dest = resolvePostAuthNavigation(
    {
      identity: { username: 'margoadmin', displayName: '' },
      settings: null,
      profileReadOk: true,
      authUserCreatedAt: '2026-11-01T00:00:00.000Z',
      isAdminOperator: true,
    },
    '/feed',
  )
  assert.equal(dest, '/admin')
})

test('proxy redirect targets consumer pages only', () => {
  assert.equal(shouldProxyRedirectAdminFromConsumerPage('/feed'), true)
  assert.equal(shouldProxyRedirectAdminFromConsumerPage('/admin'), false)
  assert.equal(shouldProxyRedirectAdminFromConsumerPage('/api/auth/logout'), false)
  assert.equal(shouldProxyRedirectAdminFromConsumerPage('/signin'), false)
})
