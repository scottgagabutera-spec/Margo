import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

describe('report email notify', () => {
  it('logs structured outcomes without addresses', () => {
    const notify = fs.readFileSync('lib/report-email-notify.ts', 'utf8')
    assert.match(notify, /outcome=sent/)
    assert.match(notify, /missing_resend_api_key/)
    assert.match(notify, /rate_limit/)
    assert.match(notify, /outcome=\$\{outcome\.status\}|outcome=failed/)
    assert.doesNotMatch(notify, /console\.(info|error).*REPORT_EMAIL/)
  })
})

describe('post_reports reason_note migration', () => {
  it('adds nullable reason_note with char_length check', () => {
    const sql = fs.readFileSync(
      'supabase/migrations/20261023140000_post_reports_reason_note.sql',
      'utf8',
    )
    assert.match(sql, /add column if not exists reason_note text/)
    assert.match(sql, /post_reports_reason_note_length_check/)
    assert.match(sql, /char_length\(reason_note\) <= 300/)
    assert.doesNotMatch(sql, /create policy/i)
    assert.doesNotMatch(sql, /drop policy/i)
    assert.doesNotMatch(sql, /^revoke /im)
    assert.doesNotMatch(sql, /^grant /im)
  })
})
