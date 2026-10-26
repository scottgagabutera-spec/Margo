import assert from 'node:assert/strict'
import test from 'node:test'
import { usernamePeekIndicatesTaken } from './username-peek-availability.ts'

test('own username by profile id is not taken', () => {
  assert.equal(
    usernamePeekIndicatesTaken(
      { id: 'uid-1', username: 'margo_label' },
      'margo_label',
      'margo_label',
      'uid-1',
    ),
    false,
  )
})

test('own username by handle match is not taken even when id differs in peek', () => {
  assert.equal(
    usernamePeekIndicatesTaken(
      { id: 'uid-1', username: 'margo_label' },
      'margo_label',
      'margo_label',
      'uid-2',
    ),
    false,
  )
})

test('another users handle is taken', () => {
  assert.equal(
    usernamePeekIndicatesTaken(
      { id: 'other', username: 'margo_label' },
      'margo_label',
      'scott_music',
      'uid-1',
    ),
    true,
  )
})
