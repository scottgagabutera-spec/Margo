import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

test('Hub overlay is not auto-closed while already on /signin', () => {
  const src = fs.readFileSync('components/hub-menu.tsx', 'utf8')
  assert.doesNotMatch(src, /path === '\/signin' && open/)
  assert.match(src, /prev !== '\/signin'/)
})

test('Sign In tab yields active state to Hub when overlay is open', () => {
  const src = fs.readFileSync('components/mobile-tab-bar.tsx', 'utf8')
  assert.match(src, /signInTabActive = isOnSignInRoute && !hubOpen/)
})
