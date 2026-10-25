import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  canSavePasswordPair,
  PASSWORD_MISMATCH_MESSAGE,
  validatePasswordPair,
} from './auth-password-confirm.ts'

describe('validatePasswordPair', () => {
  it('accepts matching valid passwords', () => {
    assert.equal(canSavePasswordPair('validpass1', 'validpass1'), true)
  })

  it('rejects mismatch on confirm field', () => {
    const r = validatePasswordPair('validpass1', 'validpass2')
    assert.equal(r.ok, false)
    if (!r.ok) {
      assert.equal(r.field, 'confirm')
      assert.equal(r.message, PASSWORD_MISMATCH_MESSAGE)
    }
  })

  it('rejects weak password on password field', () => {
    const r = validatePasswordPair('short', 'short')
    assert.equal(r.ok, false)
    if (!r.ok) assert.equal(r.field, 'password')
  })
})
