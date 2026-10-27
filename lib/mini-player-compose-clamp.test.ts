import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

test('compose floating player clamp clears CTA row', () => {
  const src = fs.readFileSync('components/mini-player-feed-chrome.tsx', 'utf8')
  assert.match(src, /composeClampInsets[\s\S]*--margo-cta-bar-h/)
  assert.match(src, /bottom: tabbar \+ 8 \+ lift/)
})
