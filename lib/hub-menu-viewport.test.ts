import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { pickHubViewportSurface } from './hub-menu-viewport.ts'

test('A6 only one Hub surface in DOM when open', () => {
  assert.equal(pickHubViewportSurface(false, false), 'none')
  assert.equal(pickHubViewportSurface(false, true), 'none')
  assert.equal(pickHubViewportSurface(true, false), 'sheet')
  assert.equal(pickHubViewportSurface(true, true), 'panel')
})

test('A3 A6 hub-menu: no profile row, single sign-in control id', () => {
  const src = fs.readFileSync('components/hub-menu.tsx', 'utf8')
  assert.ok(!src.includes('HubIdentityHeader'), 'profile row removed from Hub')
  assert.ok(!src.includes('margo-hub-identity'), 'no identity markup in Hub')
  assert.equal((src.match(/id="margo-hub-sign-in"/g) || []).length, 1)
  assert.ok(src.includes('pickHubViewportSurface'), 'one Hub surface mounted by viewport')
})
