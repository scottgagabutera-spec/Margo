import assert from 'node:assert/strict'
import test from 'node:test'
import {
  PROFILE_ACCOUNT_MENU_MAX_WIDTH_PX,
  profileAccountMenuRowCount,
} from './profile-account-menu-layout.ts'

test('profile menu width matches compact spec', () => {
  assert.equal(PROFILE_ACCOUNT_MENU_MAX_WIDTH_PX, 208)
})

test('regular members get two menu rows', () => {
  assert.equal(profileAccountMenuRowCount(false), 2)
})

test('approved artists get Studio as third row', () => {
  assert.equal(profileAccountMenuRowCount(true), 3)
})
