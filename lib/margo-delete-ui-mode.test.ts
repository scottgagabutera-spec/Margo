import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { margoDeleteUiMode } from './margo-delete-ui-mode.ts'

describe('margo delete ui mode', () => {
  it('defaults to inline without env', () => {
    const prev = process.env.NEXT_PUBLIC_MARGO_DELETE_UI
    delete process.env.NEXT_PUBLIC_MARGO_DELETE_UI
    assert.equal(margoDeleteUiMode(), 'inline')
    if (prev !== undefined) process.env.NEXT_PUBLIC_MARGO_DELETE_UI = prev
  })
})
