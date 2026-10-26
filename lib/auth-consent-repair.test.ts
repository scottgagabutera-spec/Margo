import assert from 'node:assert/strict'
import test from 'node:test'

/** Mirrors ensureProfile consent backfill predicate [read from code]. */
export function shouldBackfillProfileLegal(
  settings: Record<string, unknown> | null | undefined,
  hasLegalMeta: boolean,
): boolean {
  return hasLegalMeta && !(settings?.legal && typeof settings.legal === 'object')
}

test('missing consent row in profile settings should backfill when auth metadata has terms', () => {
  assert.equal(shouldBackfillProfileLegal(null, true), true)
  assert.equal(shouldBackfillProfileLegal({ onboarding: {} }, true), true)
  assert.equal(
    shouldBackfillProfileLegal({ legal: { termsAcceptedAt: 'x', termsVersion: '1' } }, true),
    false,
  )
  assert.equal(shouldBackfillProfileLegal(null, false), false)
})
