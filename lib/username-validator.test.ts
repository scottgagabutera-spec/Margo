import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  normalizeUsernameInput,
  validateUsernameChoice,
  usernameReservedMatchKey,
} from './username-validator.ts'

describe('username validator', () => {
  it('normalizes to lowercase a-z0-9_ and max 30', () => {
    assert.equal(normalizeUsernameInput('  Scott_Music  '), 'scott_music')
    assert.equal(normalizeUsernameInput('a'.repeat(40)).length, 30)
  })

  it('rejects too short and reserved exact names', () => {
    assert.equal(validateUsernameChoice('ab').ok, false)
    assert.equal(validateUsernameChoice('margo').ok, false)
    assert.equal(validateUsernameChoice('scott').ok, false)
    assert.equal(validateUsernameChoice('scottgaga').ok, false)
  })

  it('allows names that only contain a reserved word as substring', () => {
    assert.equal(validateUsernameChoice('scott_music').ok, true)
    assert.equal(validateUsernameChoice('scottie').ok, true)
  })

  it('blocks simple look-alikes', () => {
    assert.equal(validateUsernameChoice('sc0tt').ok, false)
    assert.equal(validateUsernameChoice('adm1n').ok, false)
    assert.equal(usernameReservedMatchKey('sc0tt'), usernameReservedMatchKey('scott'))
  })

  it('lets existing holder keep a reserved current username', () => {
    const r = validateUsernameChoice('margo', 'margo')
    assert.equal(r.ok, true)
    if (r.ok) assert.equal(r.value, 'margo')
  })

  it('blocks changing into a reserved name', () => {
    assert.equal(validateUsernameChoice('margo', 'listener1234').ok, false)
  })
})
