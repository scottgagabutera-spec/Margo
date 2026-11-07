import assert from 'node:assert/strict'
import test from 'node:test'
import { planWelcomeSeriesSends } from './eligibility.ts'
import type { ProfileSettingsJson } from '../welcome-profile-settings.ts'

const baseSettings = (): ProfileSettingsJson => ({
  onboarding: {
    completedAt: '2026-11-08T00:00:00.000Z',
    welcomeSeriesVersion: 1,
    welcomeSeriesAnchorAt: '2026-11-08T00:00:00.000Z',
    role: 'listener',
  },
  notifications: { tipsFromMargo: true },
})

const emptyActivity = {
  memoryCount: 0,
  postCount: 0,
  followingCount: 0,
  hasArtistApplication: false,
}

test('sends welcome once for new-series user', () => {
    const plan = planWelcomeSeriesSends({
      settings: baseSettings(),
      activity: emptyActivity,
      nowMs: Date.parse('2026-11-08T01:00:00.000Z'),
      devOverrideHours: null,
      onboardingRole: 'listener',
    })
    assert.equal(plan.length, 1)
    assert.equal(plan[0]?.kind, 'welcome')
})

test('skips nudges when user already has a memory', () => {
    const settings = baseSettings()
    ;(settings.onboarding as Record<string, unknown>).welcomeSentAt = '2026-11-08T00:10:00.000Z'
    const plan = planWelcomeSeriesSends({
      settings,
      activity: { ...emptyActivity, memoryCount: 2 },
      nowMs: Date.parse('2026-11-11T00:00:00.000Z'),
      devOverrideHours: 96,
      onboardingRole: 'listener',
    })
    assert.equal(plan.find((p) => p.kind === 'first_memory'), undefined)
})

test('existing accounts without welcomeSeriesVersion get nothing', () => {
    const plan = planWelcomeSeriesSends({
      settings: {
        onboarding: { completedAt: '2025-01-01T00:00:00.000Z' },
      },
      activity: emptyActivity,
      nowMs: Date.now(),
      devOverrideHours: null,
      onboardingRole: 'listener',
    })
    assert.equal(plan.length, 0)
})

test('tips toggle off blocks sends', () => {
    const settings = baseSettings()
    settings.notifications = { tipsFromMargo: false }
    const plan = planWelcomeSeriesSends({
      settings,
      activity: emptyActivity,
      nowMs: Date.parse('2026-11-08T01:00:00.000Z'),
      devOverrideHours: null,
      onboardingRole: 'listener',
    })
    assert.equal(plan.length, 0)
})

test('artist guide with welcome for artist role', () => {
    const settings = baseSettings()
    ;(settings.onboarding as Record<string, unknown>).role = 'artist'
    const plan = planWelcomeSeriesSends({
      settings,
      activity: emptyActivity,
      nowMs: Date.parse('2026-11-08T01:00:00.000Z'),
      devOverrideHours: null,
      onboardingRole: 'artist',
    })
  assert.deepEqual(plan.map((p) => p.kind), ['welcome', 'artist_guide'])
})
