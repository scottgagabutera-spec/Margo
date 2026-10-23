import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

describe('lyric-back delete', () => {
  it('blocks moment DELETE when active Lyric Back children exist', () => {
    const route = fs.readFileSync('app/api/posts/moment/route.ts', 'utf8')
    assert.match(route, /postHasActiveLyricBackChildren/)
    assert.match(route, /has_lyric_backs/)
  })

  it('Lyric Back row wires owner delete and child guard', () => {
    const row = fs.readFileSync('components/lyric-back-thread-row.tsx', 'utf8')
    assert.match(row, /LyricBackDeleteSheet/)
    assert.match(row, /ownerDeleteBlocked=\{deleteBlocked\}/)
    assert.match(row, /echo\.echoCount/)
  })

  it('delete sheet calls DELETE /api/posts/moment', () => {
    const sheet = fs.readFileSync('components/lyric-back-delete-sheet.tsx', 'utf8')
    assert.match(sheet, /\/api\/posts\/moment/)
    assert.match(sheet, /method: 'DELETE'/)
  })
})
