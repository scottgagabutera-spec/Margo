import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

test('signin route clears keepalive only on entry, not while leaving via tab tap', () => {
  const src = fs.readFileSync('components/primary-tab-shell.tsx', 'utf8')
  assert.match(src, /prevPathForSigninRef/)
  assert.match(src, /prev === '\/signin'/)
  assert.match(src, /clearKeepalivePaintSync/)
  assert.doesNotMatch(src, /normalizeTabPath\(pathname\) === '\/signin'[\s\S]*clearPaintedTabSync\(\)/)
})

test('active tab paint includes acked tab before route commits', () => {
  const src = fs.readFileSync('components/primary-tab-shell.tsx', 'utf8')
  assert.match(src, /paintedTab \?\? ackedTab \?\? routeTab/)
})
