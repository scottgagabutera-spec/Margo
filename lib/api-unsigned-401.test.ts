import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

describe('unsigned API session gates', () => {
  it('POST /api/moderate requires session (401 via requireSessionUserId)', () => {
    const route = fs.readFileSync('app/api/moderate/route.ts', 'utf8')
    assert.match(route, /requireSessionUserId/)
    assert.match(route, /if \(!session\.ok\) return session\.res/)
  })

  it('POST /api/posts/report requires signed-in user (401)', () => {
    const route = fs.readFileSync('app/api/posts/report/route.ts', 'utf8')
    assert.match(route, /if \(!userId\)/)
    assert.match(route, /status: 401/)
  })
})
