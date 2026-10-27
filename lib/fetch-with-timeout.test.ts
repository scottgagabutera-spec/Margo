import assert from 'node:assert/strict'
import test from 'node:test'
import { FetchTimeoutError } from './fetch-with-timeout.ts'

test('FetchTimeoutError is named for timeout detection', () => {
  const err = new FetchTimeoutError()
  assert.equal(err.name, 'FetchTimeoutError')
})
