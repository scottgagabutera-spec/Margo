import assert from 'node:assert/strict'
import test from 'node:test'
import { errorReferenceLine } from './error-reference.ts'

test('error reference prefers Next digest', () => {
  assert.equal(errorReferenceLine({ digest: 'abc123digest' }), 'abc123digest')
})

test('error reference falls back to message prefix', () => {
  assert.equal(errorReferenceLine({ message: 'Cannot read properties of undefined' }), 'Cannot read ')
})

test('error reference empty when no digest or message', () => {
  assert.equal(errorReferenceLine({}), null)
})
