import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

test('A2 messages inbox from hub uses explicit parent back (no history pop)', () => {
  const src = fs.readFileSync('components/nav-back.tsx', 'utf8')
  assert.match(src, /if \(p === '\/messages'\) \{\s*return \{ \.\.\.hubTileBack\('\/feed'\)/)
  assert.match(src, /function hubTileBack[\s\S]*preferHistory: false/)
})

test('A2 conversation back goes to inbox explicitly', () => {
  const src = fs.readFileSync('components/nav-back.tsx', 'utf8')
  assert.match(src, /if \(p\.startsWith\('\/messages\/'\)\) \{[\s\S]*fallbackHref: '\/messages'/)
  assert.match(src, /if \(p\.startsWith\('\/messages\/'\)\) \{[\s\S]*preferHistory: false/)
})

test('A2 notifications and library use hubTileBack with preferHistory false', () => {
  const src = fs.readFileSync('components/nav-back.tsx', 'utf8')
  assert.match(src, /if \(p === '\/notifications'\)/)
  assert.match(src, /if \(p === '\/library' \|\| p\.startsWith\('\/library\/'\)\)/)
})
