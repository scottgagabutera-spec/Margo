import assert from 'node:assert/strict'
import test from 'node:test'
import { WELCOME_ROLE_OPTIONS } from './welcome-role-ui.ts'

test('welcome step 3 exposes exactly two role choices', () => {
  assert.equal(WELCOME_ROLE_OPTIONS.length, 2)
  assert.deepEqual(
    WELCOME_ROLE_OPTIONS.map((o) => o.value),
    ['listener', 'artist'],
  )
})
