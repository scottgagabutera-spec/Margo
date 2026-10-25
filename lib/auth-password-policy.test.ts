import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  parsePasswordErrorMessage,
  passwordStrengthHint,
  validatePassword,
} from './auth-password-policy.ts'

describe('auth password policy', () => {
  it('requires length, letter, and number', () => {
    assert.equal(validatePassword('abcdefgh').ok, false)
    assert.equal(validatePassword('1234567890').ok, false)
    assert.equal(validatePassword('abcdefgh1').ok, false)
    assert.equal(validatePassword('abcdefghij1').ok, true)
    assert.equal(validatePassword('a'.repeat(15)).ok, false)
  })

  it('maps generic password errors without stale length-only copy', () => {
    const parsed = parsePasswordErrorMessage('Password should be at least 6 characters.')
    assert.match(parsed, /6|8|character/i)
  })

  it('strength hint tracks weak letter-only passwords', () => {
    assert.equal(passwordStrengthHint('abcdefghijklmno'), 'weak')
    assert.equal(passwordStrengthHint('abcdefghij1'), 'fair')
  })
})
