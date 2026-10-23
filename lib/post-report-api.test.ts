import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

describe('post_reports reason_note migration', () => {
  it('adds nullable reason_note only', () => {
    const sql = fs.readFileSync(
      'supabase/migrations/20261023140000_post_reports_reason_note.sql',
      'utf8',
    )
    assert.match(sql, /add column if not exists reason_note text/)
    assert.doesNotMatch(sql, /create policy/i)
    assert.doesNotMatch(sql, /drop policy/i)
    assert.doesNotMatch(sql, /^revoke /im)
    assert.doesNotMatch(sql, /^grant /im)
  })
})
