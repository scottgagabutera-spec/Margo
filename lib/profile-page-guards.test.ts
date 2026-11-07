import assert from 'node:assert/strict'
import test from 'node:test'
import { errorReferenceLine } from './error-reference.ts'

test('pane error ref does not expose Cannot read message prefix', () => {
  const ref = errorReferenceLine({ message: 'Cannot read properties of undefined (reading "username")' })
  assert.equal(ref, 'runtime-error')
})

test('pane error ref prefers digest', () => {
  const ref = errorReferenceLine({ digest: 'abc123digest', message: 'secret internals' })
  assert.equal(ref, 'abc123digest')
})
