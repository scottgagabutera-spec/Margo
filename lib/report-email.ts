import type { PostReportReason } from '@/lib/post-report'

export type ReportUrgency = 'HIGH' | 'MEDIUM' | 'LOW'

const URGENCY_BY_REASON: Record<PostReportReason, ReportUrgency> = {
  Harassment: 'HIGH',
  Inappropriate: 'MEDIUM',
  Spam: 'LOW',
  Other: 'LOW',
}

export function reportReasonUrgency(reason: PostReportReason): ReportUrgency {
  return URGENCY_BY_REASON[reason]
}

/** Strip control chars and newlines from single-line email fields (subject, etc.). */
export function sanitizeEmailSingleLine(raw: string, maxLen: number): string {
  return raw
    .replace(/[\r\n\u0000-\u001f\u007f-\u009f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen)
}

/** Plain-text body lines: drop nulls; keep intentional newlines out of snippets via single-line helper. */
export function sanitizeEmailBodyText(raw: string, maxLen: number): string {
  return raw
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
    .slice(0, maxLen)
}

export function shortPostId(postId: string): string {
  const clean = postId.replace(/[^a-f0-9-]/gi, '').slice(0, 8)
  return clean || 'unknown'
}

export function buildReportEmailSubject(reason: PostReportReason, postId: string): string {
  const urgency = reportReasonUrgency(reason)
  const reasonSafe = sanitizeEmailSingleLine(reason, 40)
  const idSafe = sanitizeEmailSingleLine(shortPostId(postId), 12)
  return `[${urgency}] ${reasonSafe} — post ${idSafe}`
}

export type ReportEmailBodyInput = {
  siteOrigin: string
  reportId: string
  postId: string
  reason: PostReportReason
  reasonNote: string | null
  reportedAtIso: string
  reporterHandle: string
  reporterProfileId: string
  authorHandle: string
  postSnippet: string
  postKind: 'Normal post' | 'Lyric Back'
  lyricBackDepth: number | null
  postUrl: string
  adminReportsUrl: string
  otherReportsOnPost: number
}

export function formatReportTimes(iso: string): { utc: string; manila: string } {
  const d = new Date(iso)
  const utc = Number.isNaN(d.getTime())
    ? iso
    : d.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC')
  const manila = Number.isNaN(d.getTime())
    ? iso
    : `${new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Manila',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d)} (UTC+8)`
  return { utc, manila }
}

export function buildReportEmailText(input: ReportEmailBodyInput): string {
  const times = formatReportTimes(input.reportedAtIso)
  const lines: string[] = [
    'Margo post report',
    '',
    `Reporter: @${sanitizeEmailSingleLine(input.reporterHandle, 80)} (${input.reporterProfileId})`,
    `Reported: ${input.postKind}${input.lyricBackDepth != null ? ` (depth ${input.lyricBackDepth})` : ''}`,
    `Post: ${input.postUrl}`,
    `Snippet: ${sanitizeEmailBodyText(input.postSnippet, 280)}`,
    `Author: @${sanitizeEmailSingleLine(input.authorHandle, 80)}`,
    `Reason: ${sanitizeEmailSingleLine(input.reason, 40)}`,
  ]
  if (input.reasonNote) {
    lines.push(`Note: ${sanitizeEmailBodyText(input.reasonNote, 300)}`)
  }
  lines.push(
    `Time (UTC): ${times.utc}`,
    `Time (Manila): ${times.manila}`,
    `Admin: ${input.adminReportsUrl}`,
  )
  if (input.otherReportsOnPost > 0) {
    lines.push(
      '',
      `This post already has ${input.otherReportsOnPost} other report(s) on file (excluding this one).`,
    )
  }
  lines.push('', `Report id: ${input.reportId}`)
  return lines.join('\n')
}

const RESEND_SEND_TIMEOUT_MS = 8000

export async function sendResendPlainEmail(opts: {
  apiKey: string
  from: string
  to: string
  subject: string
  text: string
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), RESEND_SEND_TIMEOUT_MS)
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: sanitizeEmailSingleLine(opts.from, 200),
        to: [sanitizeEmailSingleLine(opts.to, 200)],
        subject: sanitizeEmailSingleLine(opts.subject, 200),
        text: opts.text,
      }),
      signal: controller.signal,
    })
    if (!res.ok) {
      const snippet = sanitizeEmailSingleLine(await res.text().catch(() => ''), 120)
      return { ok: false, reason: `resend_http_${res.status}${snippet ? `_${snippet}` : ''}` }
    }
    return { ok: true }
  } catch (err) {
    const name = err instanceof Error ? err.name : 'error'
    return { ok: false, reason: sanitizeEmailSingleLine(name, 40) }
  } finally {
    clearTimeout(timeout)
  }
}

