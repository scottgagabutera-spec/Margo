import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

describe('lyric-back edit', () => {
  it('PATCH route checks owner and parent_post_id', () => {
    const route = fs.readFileSync('app/api/posts/lyric-back/route.ts', 'utf8')
    assert.match(route, /export async function PATCH/)
    assert.match(route, /author_profile_id !== userId/)
    assert.match(route, /parent_post_id/)
    assert.match(route, /resolveLyricBackStoredEmotion/)
  })

  it('edit sheet PATCHes lyric-back and calls moderate', () => {
    const sheet = fs.readFileSync('components/lyric-back-edit-sheet.tsx', 'utf8')
    assert.match(sheet, /method: 'PATCH'/)
    assert.match(sheet, /\/api\/moderate/)
  })

  it('owner row exposes Edit in shared menu', () => {
    const row = fs.readFileSync('components/lyric-back-thread-row.tsx', 'utf8')
    assert.match(row, /showOwnerEdit/)
    assert.match(row, /LyricBackEditSheet/)
  })
})
