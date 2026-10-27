import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { hidesTabBar } from './chrome-mode.ts'

test('hidesTabBar keeps /signin tab bar on mobile primary chrome only', () => {
  assert.equal(hidesTabBar('/signin'), true)
  assert.equal(hidesTabBar('/signin', { mobilePrimaryChrome: true }), false)
  assert.equal(hidesTabBar('/signin', { mobilePrimaryChrome: false }), true)
  assert.equal(hidesTabBar('/forgot-password', { mobilePrimaryChrome: true }), true)
})

test('AuthGateModal uses tab-bar band on phone (z-index 45, bottom inset)', () => {
  const src = fs.readFileSync('components/auth-gate-modal.tsx', 'utf8')
  assert.match(src, /zIndex: phoneSheet \? 45 : 1000/)
  assert.match(src, /--margo-tabbar-h/)
  assert.match(src, /data-margo-auth-gate-modal/)
})

test('SignInLink leaves primary tab surface before navigation', () => {
  const src = fs.readFileSync('components/signin-link.tsx', 'utf8')
  assert.match(src, /leavePrimaryTabSurface\(\)/)
})

test('ConsentFirstShell renders children while auth loading', () => {
  const src = fs.readFileSync('components/consent-first-shell.tsx', 'utf8')
  assert.ok(src.includes('if (loading) return <>{children}</>'))
  assert.ok(!src.includes('if (loading) return null'))
})

test('Hub locked tiles navigate to sign-in with returnTo (not focus-only CTA)', () => {
  const src = fs.readFileSync('components/hub-menu.tsx', 'utf8')
  assert.match(src, /router\.push\(buildSigninHref\(returnTo\)\)/)
  assert.doesNotMatch(src, /margo-hub-sign-in.*focus\(\)/)
})

test('nav-back has no duplicate /library/ branch after exact /library', () => {
  const src = fs.readFileSync('components/nav-back.tsx', 'utf8')
  assert.equal((src.match(/p\.startsWith\('\/library\/'\)/g) || []).length, 1)
  assert.doesNotMatch(src, /if \(p === '\/library' \|\| p\.startsWith\('\/library\/'\)\)/)
})

test('MargoSearchInput uses Stage landing CSS tokens (globals.css reference)', () => {
  const css = fs.readFileSync('app/globals.css', 'utf8')
  assert.match(css, /\.margo-search-wrap--standard \.margo-search[\s\S]*font-size: 0\.82rem/)
  assert.match(css, /\.margo-search-wrap--standard \.margo-search[\s\S]*background: var\(--surface-2\)/)
  assert.match(css, /\.margo-search-wrap--catalog-hints \.margo-search-hint[\s\S]*color: var\(--text-muted\)/)
  const input = fs.readFileSync('components/margo-search-input.tsx', 'utf8')
  assert.match(input, /margo-search-wrap--standard/)
  assert.match(input, /MARGO_SEARCH_HINT_CHAR_MS/)
})
