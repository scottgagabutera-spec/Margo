import test from 'node:test'
import assert from 'node:assert/strict'
import {
  feedMemoryNudgeDismissedFromSettings,
  mergeFeedMemoryNudgeDismissed,
  shouldShowMemoryNudge,
} from './feed-memory-nudge-prefs.ts'

test('dismiss persists in profiles.settings.feed', () => {
  const merged = mergeFeedMemoryNudgeDismissed({}, true)
  assert.equal(feedMemoryNudgeDismissedFromSettings(merged), true)
})

test('shouldShowMemoryNudge waits for count', () => {
  assert.equal(shouldShowMemoryNudge({ signedIn: true, ownMemoryCount: null, dismissed: false }).reason, 'count-loading')
  assert.equal(shouldShowMemoryNudge({ signedIn: true, ownMemoryCount: 0, dismissed: false }).show, true)
  assert.equal(shouldShowMemoryNudge({ signedIn: true, ownMemoryCount: 2, dismissed: false }).show, false)
})
