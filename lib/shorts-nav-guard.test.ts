import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import test from 'node:test'

const NAV_ICON = /^(components\/margo-nav\.tsx|components\/mobile-tab-bar\.tsx|components\/icons(\/|\.))/

test('no nav bar or SVG module changes in working tree vs HEAD', () => {
  let names: string
  try {
    names = execSync('git diff --name-only HEAD', { encoding: 'utf8' })
  } catch {
    names = ''
  }
  const bad = names.split('\n').filter((n) => NAV_ICON.test(n.trim()))
  assert.deepEqual(bad, [])
})
