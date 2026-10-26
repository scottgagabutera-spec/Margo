import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveWelcomeStep4Role, welcomeStep4Cards } from './welcome-step4-content.ts'

test('step 4 defaults to listener when role skipped', () => {
  assert.equal(resolveWelcomeStep4Role(null), 'listener')
})

test('step 4 cards never exceed four per role', () => {
  for (const role of ['listener', 'artist'] as const) {
    assert.ok(welcomeStep4Cards(role).length <= 4)
    assert.equal(welcomeStep4Cards(role).at(-1)?.id, 'complete-profile')
  }
})

test('saved both maps to artist cards via resolveWelcomeStep4Role', () => {
  assert.equal(resolveWelcomeStep4Role('both'), 'artist')
  const artistIds = welcomeStep4Cards('artist').map((c) => c.id).join(',')
  const fromBoth = welcomeStep4Cards(resolveWelcomeStep4Role('both')).map((c) => c.id).join(',')
  assert.equal(fromBoth, artistIds)
})

test('artist card sets differ from listener', () => {
  const listenerIds = welcomeStep4Cards('listener').map((c) => c.id).join(',')
  const artistIds = welcomeStep4Cards('artist').map((c) => c.id).join(',')
  assert.notEqual(listenerIds, artistIds)
})
