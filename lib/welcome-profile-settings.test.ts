import assert from 'node:assert/strict'
import test from 'node:test'
import {
  mergeOnboardingSettings,
  mergeTasteVibesSettings,
  sanitizeWelcomeMoods,
  tasteVibesFromSettings,
} from './welcome-profile-settings.ts'

// Node test runner does not resolve `@/`; welcome-profile-settings only needs DISCOVER_VIBES at runtime.

test('sanitizeWelcomeMoods keeps Discover vocabulary only', () => {
  assert.deepEqual(
    sanitizeWelcomeMoods(['LOVE', 'all', 'HYPE', 'NOT_A_VIBE', 'love']),
    ['LOVE', 'HYPE'],
  )
})

test('mergeTasteVibesSettings writes profiles.settings.taste.vibes', () => {
  const next = mergeTasteVibesSettings({ notifications: { resonate: true } }, ['JOY', 'CHILL'])
  assert.deepEqual(next.taste, { vibes: ['JOY', 'CHILL'] })
  assert.deepEqual((next.notifications as { resonate: boolean }).resonate, true)
})

test('tasteVibesFromSettings reads profiles.settings.taste.vibes', () => {
  const vibes = tasteVibesFromSettings({ taste: { vibes: ['HOPE', 'bad', 'HOPE'] } })
  assert.deepEqual(vibes, ['HOPE'])
})

test('mergeOnboardingSettings stores role and completedAt under onboarding', () => {
  const next = mergeOnboardingSettings({}, { role: 'both', completedAt: '2026-01-01T00:00:00.000Z' })
  assert.deepEqual(next.onboarding, { role: 'both', completedAt: '2026-01-01T00:00:00.000Z' })
})
