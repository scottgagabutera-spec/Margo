import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MARGO_WELCOME_ONBOARDING_AUTH_CUTOFF_ISO,
  isAuthUserCreatedAtUnavailable,
  isWelcomeOnboardingExemptPath,
  needsOnboarding,
  resolvePostAuthNavigation,
  welcomeOnboardingPath,
} from './welcome-needs-onboarding.ts'

type TestIdentity = {
  username: string
  displayName: string
}

function identity(partial: TestIdentity): TestIdentity {
  return partial
}

const baseCtx = {
  profileReadOk: true,
  settings: null as Record<string, unknown> | null,
  authUserCreatedAt: '2026-10-26T12:00:00.000Z',
}

test('rule a: member handle needs onboarding', () => {
  assert.equal(
    needsOnboarding({
      ...baseCtx,
      identity: identity({ username: 'member123456789', displayName: 'member123456789' }),
    }),
    true,
  )
})

test('rule b: empty display name needs onboarding', () => {
  assert.equal(
    needsOnboarding({
      ...baseCtx,
      authUserCreatedAt: '2020-01-01T00:00:00.000Z',
      identity: identity({ username: 'cooluser', displayName: '' }),
    }),
    true,
  )
})

test('rule b: display name equals username needs onboarding', () => {
  assert.equal(
    needsOnboarding({
      ...baseCtx,
      authUserCreatedAt: '2020-01-01T00:00:00.000Z',
      identity: identity({ username: 'ripple', displayName: 'ripple' }),
    }),
    true,
  )
})

test('rule c: new auth user after cutoff needs onboarding even with real name', () => {
  assert.equal(
    needsOnboarding({
      ...baseCtx,
      identity: identity({ username: 'scott_music', displayName: 'Scott Music' }),
    }),
    true,
  )
})

test('old account with custom username and name does NOT need onboarding', () => {
  assert.equal(
    needsOnboarding({
      ...baseCtx,
      authUserCreatedAt: '2025-06-01T00:00:00.000Z',
      identity: identity({ username: 'scott_music', displayName: 'Scott Music' }),
    }),
    false,
  )
})

test('completedAt set never needs onboarding', () => {
  assert.equal(
    needsOnboarding({
      ...baseCtx,
      settings: { onboarding: { completedAt: '2026-10-27T00:00:00.000Z' } },
      identity: identity({ username: 'member999', displayName: 'member999' }),
    }),
    false,
  )
})

test('missing auth created_at does not skip welcome for fresh stub identity', () => {
  assert.equal(
    needsOnboarding({
      profileReadOk: true,
      settings: { legal: { termsAcceptedAt: '2026-10-26T00:00:00.000Z', termsVersion: '1' } },
      authUserCreatedAt: null,
      identity: identity({ username: 'member123456789', displayName: '' }),
    }),
    true,
  )
})

test('missing auth created_at skips welcome for established legacy account', () => {
  assert.equal(
    needsOnboarding({
      profileReadOk: true,
      settings: null,
      authUserCreatedAt: null,
      identity: identity({ username: 'margo_label', displayName: 'Margo Music' }),
    }),
    false,
  )
})

test('isAuthUserCreatedAtUnavailable only when null, empty, or unparseable', () => {
  assert.equal(isAuthUserCreatedAtUnavailable(null), true)
  assert.equal(isAuthUserCreatedAtUnavailable(undefined), true)
  assert.equal(isAuthUserCreatedAtUnavailable(''), true)
  assert.equal(isAuthUserCreatedAtUnavailable('   '), true)
  assert.equal(isAuthUserCreatedAtUnavailable('not-a-date'), true)
  assert.equal(isAuthUserCreatedAtUnavailable('2025-06-01T00:00:00.000Z'), false)
})

test('old account with real name and no completedAt resolves to feed when created_at before cutoff', () => {
  const ctx = {
    profileReadOk: true,
    settings: null as Record<string, unknown> | null,
    authUserCreatedAt: '2025-06-01T00:00:00.000Z',
    identity: identity({ username: 'scott_music', displayName: 'Scott Music' }),
  }
  assert.equal(isAuthUserCreatedAtUnavailable(ctx.authUserCreatedAt), false)
  assert.equal(needsOnboarding(ctx), false)
  assert.equal(resolvePostAuthNavigation(ctx, '/feed'), '/feed')
  assert.equal(resolvePostAuthNavigation(ctx, null), '/feed')
})

test('profile read failure fails open', () => {
  assert.equal(
    needsOnboarding({
      profileReadOk: false,
      settings: null,
      authUserCreatedAt: baseCtx.authUserCreatedAt,
      identity: identity({ username: 'member999', displayName: 'member999' }),
    }),
    false,
  )
})

test('resolvePostAuthNavigation sends onboarding to welcome with returnTo', () => {
  const dest = resolvePostAuthNavigation(
    {
      ...baseCtx,
      identity: identity({ username: 'member1', displayName: 'member1' }),
    },
    '/feed',
  )
  assert.equal(dest, welcomeOnboardingPath('/feed'))
  assert.match(dest, /^\/welcome\?step=1&returnTo=/)
})

test('completed account resolves to feed not welcome', () => {
  const dest = resolvePostAuthNavigation(
    {
      ...baseCtx,
      settings: { onboarding: { completedAt: '2026-10-27T00:00:00.000Z' } },
      identity: identity({ username: 'member1', displayName: 'member1' }),
    },
    null,
  )
  assert.equal(dest, '/feed')
})

test('future-provider scenario matches email and Google (provider-blind)', () => {
  const ctx = {
    ...baseCtx,
    identity: identity({ username: 'member555', displayName: 'member555' }),
  }
  const emailDest = resolvePostAuthNavigation(ctx, '/feed')
  const googleDest = resolvePostAuthNavigation(ctx, '/feed')
  const futureDest = resolvePostAuthNavigation(ctx, '/feed')
  assert.equal(emailDest, googleDest)
  assert.equal(googleDest, futureDest)
  assert.match(futureDest, /\/welcome\?step=1/)
})

test('/welcome path is exempt from enforcer', () => {
  assert.equal(isWelcomeOnboardingExemptPath('/welcome'), true)
  assert.equal(isWelcomeOnboardingExemptPath('/welcome?step=2'), true)
  assert.equal(isWelcomeOnboardingExemptPath('/feed'), false)
  assert.equal(isWelcomeOnboardingExemptPath('/signin'), true)
  assert.equal(isWelcomeOnboardingExemptPath('/signup'), true)
})

test('cutoff constant is documented deploy date', () => {
  assert.equal(MARGO_WELCOME_ONBOARDING_AUTH_CUTOFF_ISO, '2026-10-26T00:00:00.000Z')
})
