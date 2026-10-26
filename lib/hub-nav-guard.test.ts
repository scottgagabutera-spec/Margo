import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import test from 'node:test'

const NAV_ICON_PATH = /^(components\/margo-nav\.tsx|components\/mobile-tab-bar\.tsx|components\/icons(\/|\.))/

test('C gate: HEAD commit does not modify nav bar markup or SVG icon modules', () => {
  let names: string[]
  try {
    names = execSync('git show --name-only --pretty=format: --no-renames HEAD', {
      encoding: 'utf8',
    })
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
  } catch {
    names = []
  }
  const bad = names.filter((n) => NAV_ICON_PATH.test(n))
  assert.deepEqual(
    bad,
    [],
    `Nav/icon files must not change in the hub+lyric commit: ${bad.join(', ')}`,
  )
})
