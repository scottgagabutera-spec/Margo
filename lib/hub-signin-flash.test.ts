import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

test('Hub sign-in keeps overlay until /signin route (no pre-close flash)', () => {
  const hub = fs.readFileSync('components/hub-menu.tsx', 'utf8')
  assert.match(hub, /path === '\/signin' && prev !== null && prev !== '\/signin'/)
  const lockedFn = hub.match(/const onLockedActivate = useCallback\([\s\S]*?\}, \[router\]\)/)
  assert.ok(lockedFn)
  assert.doesNotMatch(lockedFn![0], /setOpen\(false\)/)
  assert.match(lockedFn![0], /prepareSignInTabNavigation\(\)/)
  assert.doesNotMatch(lockedFn![0], /leavePrimaryTabSurface/)
  assert.doesNotMatch(hub, /id="margo-hub-sign-in"[\s\S]*onClick=\{close\}/)
})

test('SignInLink prepares sign-in tab paint before /signin', () => {
  const src = fs.readFileSync('components/signin-link.tsx', 'utf8')
  assert.match(src, /destPath === '\/signin'/)
  assert.match(src, /prepareSignInTabNavigation\(\)/)
})

test('/search page does not auto-focus (hint animation stays visible)', () => {
  const src = fs.readFileSync('app/search/page.tsx', 'utf8')
  assert.doesNotMatch(src, /autoFocus/)
})

test('MargoSearchInput hides overlay while focused (animation root cause)', () => {
  const src = fs.readFileSync('components/margo-search-input.tsx', 'utf8')
  assert.match(src, /showCatalogOverlay = hintText\.length > 0 && value\.length === 0 && !focused/)
})

test('Sign In tab defers highlight to Hub when overlay is open', () => {
  const src = fs.readFileSync('components/mobile-tab-bar.tsx', 'utf8')
  assert.match(src, /signInTabActiveOnSigninRoute/)
  assert.match(src, /aria-current=\{signInTabActive \? 'page' : undefined\}/)
})
