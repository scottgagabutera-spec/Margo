import assert from 'node:assert/strict'
import test from 'node:test'
import { buildPostAuthContext } from './post-auth-context.ts'
import { needsOnboarding } from './welcome-needs-onboarding.ts'

test('loading identity is not treated as read failure (skip onboarding bug)', () => {
  assert.equal(
    needsOnboarding({
      identity: null,
      settings: null,
      profileReadOk: false,
      authUserCreatedAt: null,
    }),
    false,
  )
  assert.equal(
    needsOnboarding(
      buildPostAuthContext(
        { username: 'scott_music', displayName: 'Scott Music' },
        null,
        'ok',
        '2026-10-27T00:00:00.000Z',
      ),
    ),
    true,
  )
})

test('Google create-account with real name waits for created_at before decision', () => {
  const ctx = buildPostAuthContext(
    { username: 'scott_music', displayName: 'Scott Music' },
    { legal: { termsAcceptedAt: '2026-10-26T00:00:00.000Z', termsVersion: '1' } },
    'ok',
    '2026-10-27T12:00:00.000Z',
  )
  assert.equal(needsOnboarding(ctx), true)
})

test('old account unchanged after wait context', () => {
  const ctx = buildPostAuthContext(
    { username: 'scott_music', displayName: 'Scott Music' },
    { onboarding: { completedAt: '2026-01-01T00:00:00.000Z' } },
    'ok',
    '2025-01-01T00:00:00.000Z',
  )
  assert.equal(needsOnboarding(ctx), false)
})
