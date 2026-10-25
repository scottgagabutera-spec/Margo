import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isDisplayNameReserved,
  isUsernameReserved,
  normalizeUsernameInput,
  validateDisplayNameChoice,
  validateUsernameChoice,
  usernameMatchKey,
} from './username-validator.ts'

describe('username validator', () => {
  it('normalizes to lowercase a-z0-9_ and max 30', () => {
    assert.equal(normalizeUsernameInput('  Scott_Music  '), 'scott_music')
    assert.equal(normalizeUsernameInput('a'.repeat(40)).length, 30)
  })

  it('exempts own current username including reserved scott', () => {
    assert.equal(validateUsernameChoice('scott', 'scott').ok, true)
    assert.equal(isUsernameReserved('scott', 'scott'), false)
  })

  it('blocks scottt and gagaa via collapsed keys', () => {
    assert.equal(validateUsernameChoice('scottt').ok, false)
    assert.equal(validateUsernameChoice('gagaa').ok, false)
    assert.equal(validateUsernameChoice('ceoo').ok, false)
    assert.equal(usernameMatchKey('scottt'), usernameMatchKey('scott'))
  })

  it('blocks officialscott and margo_support patterns', () => {
    assert.equal(validateUsernameChoice('officialscott').ok, false)
    assert.equal(validateUsernameChoice('therealgaga').ok, false)
    assert.equal(validateUsernameChoice('margo_support').ok, false)
  })

  it('blocks scottgaga and gagabutera combos', () => {
    assert.equal(validateUsernameChoice('scottgaga').ok, false)
    assert.equal(validateUsernameChoice('gagabutera').ok, false)
  })

  it('blocks anything containing butera', () => {
    assert.equal(validateUsernameChoice('xbuterax').ok, false)
  })

  it('allows scottie and ladygaga substring fans', () => {
    assert.equal(validateUsernameChoice('scottie').ok, true)
    assert.equal(validateUsernameChoice('ladygaga').ok, true)
    assert.equal(validateUsernameChoice('scott_music').ok, true)
  })

  it('blocks offical typo toward official', () => {
    assert.equal(validateUsernameChoice('officalmargo').ok, false)
  })

  it('display name allows Scott but blocks official brand', () => {
    assert.equal(validateDisplayNameChoice('Scott Gaga').ok, true)
    assert.equal(isDisplayNameReserved('Official Margo'), true)
    assert.equal(validateDisplayNameChoice('Official Margo').ok, false)
  })
})
