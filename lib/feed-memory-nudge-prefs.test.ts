import test from 'node:test'
import assert from 'node:assert/strict'
import {
  feedMemoryCardsHidden,
  mergeFeedMemoryCardsDismiss,
  shouldShowMemoryCards,
} from './feed-memory-nudge-prefs.ts'

test('dismiss hides cards for seven days in profiles.settings.feed', () => {
  const now = Date.parse('2026-11-08T00:00:00.000Z')
  const merged = mergeFeedMemoryCardsDismiss({}, now)
  assert.equal(feedMemoryCardsHidden(merged, now), true)
  assert.equal(feedMemoryCardsHidden(merged, now + 7 * 86400000 - 1), true)
  assert.equal(feedMemoryCardsHidden(merged, now + 7 * 86400000 + 1), false)
})

test('shouldShowMemoryCards waits for count but not memory total', () => {
  assert.equal(shouldShowMemoryCards({ signedIn: true, ownMemoryCount: null, dismissed: false }).reason, 'count-loading')
  assert.equal(shouldShowMemoryCards({ signedIn: true, ownMemoryCount: 0, dismissed: false }).show, true)
  assert.equal(shouldShowMemoryCards({ signedIn: true, ownMemoryCount: 5, dismissed: false }).show, true)
  assert.equal(shouldShowMemoryCards({ signedIn: true, ownMemoryCount: 0, dismissed: true }).show, false)
})
