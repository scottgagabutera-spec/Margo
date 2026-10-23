import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  buildReportEmailSubject,
  buildReportEmailText,
  reportReasonUrgency,
  sanitizeEmailSingleLine,
} from './report-email.ts'

describe('report-email', () => {
  it('maps urgency by reason', () => {
    assert.equal(reportReasonUrgency('Harassment'), 'HIGH')
    assert.equal(reportReasonUrgency('Inappropriate'), 'MEDIUM')
    assert.equal(reportReasonUrgency('Spam'), 'LOW')
    assert.equal(reportReasonUrgency('Other'), 'LOW')
  })

  it('builds subject with urgency prefix and sanitized reason', () => {
    const s = buildReportEmailSubject('Harassment', 'abc12345-0000-0000-0000-000000000099')
    assert.match(s, /^\[HIGH\] Harassment — post abc12345/)
    const injected = buildReportEmailSubject('Other', 'x\r\nBcc: evil@x.com')
    assert.doesNotMatch(injected, /\r|\n/)
  })

  it('escapes header injection in single-line sanitizer', () => {
    assert.equal(sanitizeEmailSingleLine('hello\r\nSubject: bad', 100), 'hello Subject: bad')
    assert.equal(sanitizeEmailSingleLine('  a\tb  ', 100), 'a b')
  })

  it('builds plain body with post kind and other-report line', () => {
    const text = buildReportEmailText({
      siteOrigin: 'https://trymargo.com',
      reportId: 'r1',
      postId: 'p1',
      reason: 'Other',
      reasonNote: 'note',
      reportedAtIso: '2026-10-23T03:00:00.000Z',
      reporterHandle: 'reporter',
      reporterProfileId: 'uid-1',
      authorHandle: 'author',
      postSnippet: 'Lyric line',
      postKind: 'Lyric Back',
      lyricBackDepth: 2,
      postUrl: 'https://trymargo.com/post/p1',
      adminReportsUrl: 'https://trymargo.com/admin?section=reports',
      otherReportsOnPost: 2,
    })
    assert.match(text, /Lyric Back \(depth 2\)/)
    assert.match(text, /2 other report/)
    assert.match(text, /Note: note/)
    assert.match(text, /Admin: https:\/\/trymargo.com\/admin\?section=reports/)
  })

})

describe('posts/report route email wiring', () => {
  it('schedules email with after() so Vercel keeps the task alive', () => {
    const route = fs.readFileSync('app/api/posts/report/route.ts', 'utf8')
    assert.match(route, /after\(/)
    assert.match(route, /runReportEmailJob/)
    assert.match(route, /logReportEmailOutcome/)
    assert.doesNotMatch(route, /TODO\(report-email\)/)
    assert.doesNotMatch(route, /enqueueReportEmail/)
  })
})
