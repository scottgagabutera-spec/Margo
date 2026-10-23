import { sanitizeEmailSingleLine, shortPostId } from './report-email.ts'

export const REPORT_EMAIL_TIMEOUT_MS = 8000

export type ReportEmailOutcome =
  | { status: 'sent' }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; reason: string }

export function logReportEmailScheduled(reportId: string): void {
  const rid = sanitizeEmailSingleLine(shortPostId(reportId), 12)
  console.info(`[report-email] outcome=scheduled reportId=${rid}`)
}

export function logReportEmailOutcome(
  reportId: string,
  outcome: ReportEmailOutcome,
  durationMs: number,
): void {
  const rid = sanitizeEmailSingleLine(shortPostId(reportId), 12)
  const ms = Math.max(0, Math.round(durationMs))
  if (outcome.status === 'sent') {
    console.info(`[report-email] outcome=sent reportId=${rid} durationMs=${ms}`)
    return
  }
  const reason = sanitizeEmailSingleLine(outcome.reason, 120)
  console.error(`[report-email] outcome=${outcome.status} reason=${reason} reportId=${rid} durationMs=${ms}`)
}

export function logReportEmailTimeout(reportId: string, durationMs: number): void {
  const rid = sanitizeEmailSingleLine(shortPostId(reportId), 12)
  const ms = Math.max(0, Math.round(durationMs))
  console.error(`[report-email] outcome=timeout reportId=${rid} durationMs=${ms}`)
}

export type ReportEmailRaceResult =
  | { kind: 'completed'; outcome: ReportEmailOutcome; durationMs: number }
  | { kind: 'timeout'; durationMs: number }

/** Race the email job against a timeout (does not cancel the job). */
export async function raceReportEmailJob(
  run: () => Promise<ReportEmailOutcome>,
  timeoutMs: number,
): Promise<ReportEmailRaceResult> {
  const started = Date.now()
  let finished = false
  const job = run().then((outcome) => {
    finished = true
    return outcome
  })

  const outcome = await Promise.race([
    job,
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), timeoutMs)
    }),
  ])

  const durationMs = Date.now() - started
  if (outcome === null && !finished) {
    return { kind: 'timeout', durationMs }
  }
  return { kind: 'completed', outcome: await job, durationMs }
}

export async function awaitReportEmailJobWithTimeout(
  reportId: string,
  runJob: () => Promise<ReportEmailOutcome>,
  timeoutMs: number,
): Promise<void> {
  logReportEmailScheduled(reportId)
  const started = Date.now()
  const jobPromise = runJob()

  const raced = await Promise.race([
    jobPromise.then((outcome) => ({ type: 'done' as const, outcome })),
    new Promise<{ type: 'timeout' }>((resolve) => {
      setTimeout(() => resolve({ type: 'timeout' }), timeoutMs)
    }),
  ])

  const durationMs = Date.now() - started
  if (raced.type === 'timeout') {
    logReportEmailTimeout(reportId, durationMs)
    void jobPromise.then((outcome) => {
      logReportEmailOutcome(reportId, outcome, Date.now() - started)
    })
    return
  }

  logReportEmailOutcome(reportId, raced.outcome, durationMs)
}
