import assert from 'node:assert/strict'
import test from 'node:test'
import { welcomeVibesHintMessage } from './welcome-vibes-hint.ts'

test('welcomeVibesHintMessage counts down to three', () => {
  assert.equal(welcomeVibesHintMessage(0), 'Pick 3 to continue')
  assert.equal(welcomeVibesHintMessage(1), '2 more to go')
  assert.equal(welcomeVibesHintMessage(2), '1 more to go')
  assert.equal(welcomeVibesHintMessage(3), '3 chosen')
})
