import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'

test('MargoChromeInsetsPublisher is the sole tab bar height publisher', () => {
  const mobile = fs.readFileSync('components/mobile-tab-bar.tsx', 'utf8')
  assert.doesNotMatch(mobile, /setProperty\('--margo-tabbar-h'/)
  const nav = fs.readFileSync('components/margo-nav.tsx', 'utf8')
  assert.doesNotMatch(nav, /setProperty\('--nav-height'/)
  const pub = fs.readFileSync('components/margo-chrome-insets-publisher.tsx', 'utf8')
  assert.match(pub, /--margo-feed-tab-bar-h/)
  assert.match(pub, /--margo-header-h/)
})

test(':root aliases nav-height to measured header', () => {
  const css = fs.readFileSync('app/globals.css', 'utf8')
  assert.match(css, /--nav-height:\s*var\(--margo-header-h\)/)
})
