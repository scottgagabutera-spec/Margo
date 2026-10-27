import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

test('clearHubOverlayRestore is exported and used on tab navigation', () => {
  const scope = fs.readFileSync('lib/search-scope.ts', 'utf8')
  assert.match(scope, /export function clearHubOverlayRestore/)
  const shell = fs.readFileSync('components/primary-tab-shell.tsx', 'utf8')
  assert.match(shell, /clearHubOverlayRestore/)
  assert.match(shell, /intentTab && paintedTabRef\.current === intentTab/)
  const hub = fs.readFileSync('components/hub-menu.tsx', 'utf8')
  assert.match(hub, /clearHubOverlayRestore/)
})
