import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  MAX_POST_REPORT_NOTE,
  normalizePostReportNote,
  parsePostReportBody,
  postReportSubmitEnabled,
} from './post-report.ts'

describe('post-report', () => {
  it('parses valid reasons and trims note', () => {
    const r = parsePostReportBody({
      postId: '  abc  ',
      reason: 'Other',
      note: '  hello  ',
    })
    assert.equal(r.ok, true)
    if (!r.ok) return
    assert.equal(r.postId, 'abc')
    assert.equal(r.reason, 'Other')
    assert.equal(r.note, 'hello')
  })

  it('rejects invalid reason and missing postId', () => {
    assert.equal(parsePostReportBody({ postId: 'x', reason: 'Bad' }).ok, false)
    assert.equal(parsePostReportBody({ reason: 'Spam' }).ok, false)
  })

  it('caps note length', () => {
    const long = 'a'.repeat(MAX_POST_REPORT_NOTE + 50)
    assert.equal(normalizePostReportNote(long)?.length, MAX_POST_REPORT_NOTE)
    assert.equal(normalizePostReportNote('   '), null)
  })

  it('submit enabled only with a selected reason', () => {
    assert.equal(postReportSubmitEnabled(null), false)
    assert.equal(postReportSubmitEnabled('Spam'), true)
  })
})
