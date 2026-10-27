import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { signInTabActiveOnSigninRoute } from './mobile-tab-signin-active.ts'

test('Hub overlay is not auto-closed while already on /signin', () => {
  const src = fs.readFileSync('components/hub-menu.tsx', 'utf8')
  assert.doesNotMatch(src, /path === '\/signin' && open/)
  assert.match(src, /prev !== '\/signin'/)
})

test('Sign In tab yields active state to Hub when overlay is open', () => {
  assert.equal(signInTabActiveOnSigninRoute(true, false), true)
  assert.equal(signInTabActiveOnSigninRoute(true, true), false)
  assert.equal(signInTabActiveOnSigninRoute(false, true), false)
})

test('Hub scroll dismiss skipped off primary tab surfaces', () => {
  const src = fs.readFileSync('components/hub-menu.tsx', 'utf8')
  assert.match(src, /isHubPrimaryScrollSurface/)
  assert.match(src, /hubScrollDismiss/)
})

test('Hub sign-in marks overlay restore for browser Back', () => {
  const src = fs.readFileSync('components/hub-menu.tsx', 'utf8')
  assert.match(src, /markHubOverlayRestore/)
})
