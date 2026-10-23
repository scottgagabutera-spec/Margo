import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  awaitReportEmailJobWithTimeout,
  logReportEmailTimeout,
  raceReportEmailJob,
} from './report-email-race.ts'

describe('raceReportEmailJob', () => {
  it('returns timeout when the job is slower than the limit', async () => {
    const result = await raceReportEmailJob(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ status: 'sent' }), 200)
        }),
      25,
    )
    assert.equal(result.kind, 'timeout')
    assert.ok(result.durationMs >= 20)
  })

  it('returns completed when the job finishes in time', async () => {
    const result = await raceReportEmailJob(async () => ({ status: 'skipped', reason: 'test' }), 500)
    assert.equal(result.kind, 'completed')
    if (result.kind === 'completed') {
      assert.equal(result.outcome.status, 'skipped')
      assert.equal(result.outcome.reason, 'test')
    }
  })

  it('returns completed with failed outcome when send fails', async () => {
    const result = await raceReportEmailJob(async () => ({ status: 'failed', reason: 'resend_error' }), 500)
    assert.equal(result.kind, 'completed')
    if (result.kind === 'completed') {
      assert.equal(result.outcome.status, 'failed')
    }
  })
})

describe('logReportEmailTimeout', () => {
  it('logs outcome=timeout with 8-char reportId prefix', () => {
    const lines: string[] = []
    const prev = console.error
    console.error = (msg: string) => {
      lines.push(String(msg))
    }
    try {
      logReportEmailTimeout('abcdef12-0000-0000-0000-000000000099', 8000)
      assert.equal(lines.length, 1)
      assert.match(lines[0], /\[report-email\] outcome=timeout reportId=abcdef12 durationMs=8000/)
    } finally {
      console.error = prev
    }
  })
})

describe('awaitReportEmailJobWithTimeout', () => {
  it('resolves without throwing when the job fails quickly', async () => {
    await awaitReportEmailJobWithTimeout(
      '11111111-2222-3333-4444-555555555555',
      async () => ({ status: 'failed', reason: 'resend_error' }),
      500,
    )
  })

  it('logs timeout when the job is slower than the limit', async () => {
    const errors: string[] = []
    const prevErr = console.error
    const prevInfo = console.info
    console.error = (msg: string) => {
      errors.push(String(msg))
    }
    console.info = () => {}
    try {
      await awaitReportEmailJobWithTimeout(
        '22222222-3333-4444-5555-666666666666',
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ status: 'sent' }), 300)
          }),
        30,
      )
      assert.ok(errors.some((line) => line.includes('outcome=timeout')))
    } finally {
      console.error = prevErr
      console.info = prevInfo
    }
  })
})

describe('report-email quota wiring', () => {
  it('peeks rate limit before send and consumes only after Resend success', () => {
    const notify = fs.readFileSync('lib/report-email-notify.ts', 'utf8')
    const jobStart = notify.indexOf('export async function runReportEmailJob')
    const body = jobStart > -1 ? notify.slice(jobStart) : notify
    const peekIdx = body.indexOf('isHourlyApiRateLimitAvailable')
    const sendIdx = body.indexOf('await sendResendPlainEmail')
    const consumeIdx = body.indexOf('consumeHourlyApiRateLimit')
    assert.ok(peekIdx > -1 && sendIdx > peekIdx && consumeIdx > sendIdx)
    const afterSend = body.slice(sendIdx)
    assert.match(afterSend, /if \(!result\.ok\)/)
    const failReturn = afterSend.indexOf("return { status: 'failed'")
    const consumeAfterFail = afterSend.indexOf('consumeHourlyApiRateLimit')
    assert.ok(failReturn < consumeAfterFail)
  })
})
