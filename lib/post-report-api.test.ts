import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

describe('report email notify', () => {
  it('logs structured outcomes without addresses', () => {
    const notify = fs.readFileSync('lib/report-email-notify.ts', 'utf8')
    const race = fs.readFileSync('lib/report-email-race.ts', 'utf8')
    assert.match(race, /outcome=scheduled/)
    assert.match(race, /outcome=sent/)
    assert.match(race, /outcome=timeout/)
    assert.match(notify, /awaitReportEmailJobWithTimeout/)
    assert.match(notify, /missing_resend_api_key/)
    assert.match(notify, /rate_limit/)
    assert.match(race, /outcome=\$\{outcome\.status\}|outcome=failed/)
    assert.match(notify, /isHourlyApiRateLimitAvailable/)
    assert.match(notify, /getSupabaseAdmin\(\)/)
    assert.doesNotMatch(notify, /console\.(info|error).*REPORT_EMAIL/)
  })
})

describe('posts/report route success vs email', () => {
  it('returns ok:true after email hook without branching on send outcome', () => {
    const route = fs.readFileSync('app/api/posts/report/route.ts', 'utf8')
    const emailIdx = route.indexOf('runReportEmailAfterInsert')
    const okIdx = route.indexOf('ok: true')
    assert.ok(emailIdx > -1 && okIdx > emailIdx)
    assert.doesNotMatch(route, /if \(.*outcome.*sent/)
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
