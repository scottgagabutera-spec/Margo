import type { SupabaseClient } from '@supabase/supabase-js'
import { consumeHourlyApiRateLimit, isHourlyApiRateLimitAvailable } from '@/lib/api-rate-limit'
import type { PostReportReason } from '@/lib/post-report'
import { MARGO_SITE_ORIGIN } from '@/lib/moment/site-origin'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import {
  buildReportEmailSubject,
  buildReportEmailText,
  sanitizeEmailSingleLine,
  sendResendPlainEmail,
  shortPostId,
} from '@/lib/report-email'
import {
  awaitReportEmailJobWithTimeout,
  type ReportEmailOutcome,
} from '@/lib/report-email-race'

export type { ReportEmailOutcome, ReportEmailRaceResult } from '@/lib/report-email-race'
export {
  logReportEmailOutcome,
  logReportEmailScheduled,
  logReportEmailTimeout,
  raceReportEmailJob,
  REPORT_EMAIL_TIMEOUT_MS,
} from '@/lib/report-email-race'
import { REPORT_EMAIL_TIMEOUT_MS } from '@/lib/report-email-race'

const EMAILS_PER_HOUR = 20
const DEPTH_CAP = 8

function profileHandle(row: { username?: string | null; display_name?: string | null } | null, fallbackId: string): string {
  const u = (row?.username ?? '').replace(/^@/, '').trim()
  if (u) return u
  const d = (row?.display_name ?? '').trim()
  if (d) return d.slice(0, 40)
  return shortPostId(fallbackId)
}

async function lyricBackDepth(
  admin: SupabaseClient,
  parentPostId: string | null,
): Promise<number | null> {
  if (!parentPostId) return null
  let depth = 1
  let nextId: string | null = parentPostId
  const seen = new Set<string>()
  while (nextId && depth < DEPTH_CAP && !seen.has(nextId)) {
    seen.add(nextId)
    const { data: parentRow, error } = await admin
      .from('posts')
      .select('parent_post_id')
      .eq('id', nextId)
      .maybeSingle()
    if (error || !parentRow) break
    const parentId = parentRow.parent_post_id as string | null
    if (!parentId) return depth
    depth += 1
    nextId = parentId
  }
  return depth
}

function fromAddressLooksValid(from: string): boolean {
  const m = from.match(/@([a-z0-9.-]+)$/i)
  if (!m) return false
  const domain = m[1].toLowerCase()
  return domain === 'trymargo.com' || domain.endsWith('.trymargo.com')
}

export type ReportEmailJobInput = {
  reportId: string
  postId: string
  reason: PostReportReason
  reasonNote: string | null
  reporterId: string
  reportedAtIso: string
}

/** Runs the full report-email job; never throws. Uses a fresh service-role client. */
export async function runReportEmailJob(opts: ReportEmailJobInput): Promise<ReportEmailOutcome> {
  try {
    const admin = getSupabaseAdmin()
    if (!admin) {
      return { status: 'failed', reason: 'server_misconfigured' }
    }

    const apiKey = process.env.RESEND_API_KEY?.trim()
    const to = process.env.REPORT_EMAIL_TO?.trim()
    const from = process.env.REPORT_EMAIL_FROM?.trim()
    if (!apiKey) {
      return { status: 'skipped', reason: 'missing_resend_api_key' }
    }
    if (!to) {
      return { status: 'skipped', reason: 'missing_report_email_to' }
    }
    if (!from) {
      return { status: 'skipped', reason: 'missing_report_email_from' }
    }
    if (!fromAddressLooksValid(from)) {
      return { status: 'failed', reason: 'from_not_trymargo_domain' }
    }

    const limited = await isHourlyApiRateLimitAvailable({
      route: 'report-email',
      bucket: 'global',
      limit: EMAILS_PER_HOUR,
      failOpenOnDbError: true,
    })
    if (!limited.ok) {
      return { status: 'skipped', reason: 'rate_limit' }
    }

    const { data: post, error: postErr } = await admin
      .from('posts')
      .select('id, text, parent_post_id, author_profile_id')
      .eq('id', opts.postId)
      .maybeSingle()
    if (postErr || !post) {
      return { status: 'failed', reason: 'post_load_failed' }
    }

    const [{ data: reporter }, { data: author }, depth, reportCountRes] = await Promise.all([
      admin.from('profiles').select('username, display_name').eq('id', opts.reporterId).maybeSingle(),
      admin.from('profiles').select('username, display_name').eq('id', post.author_profile_id).maybeSingle(),
      lyricBackDepth(admin, post.parent_post_id),
      admin
        .from('post_reports')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', opts.postId),
    ])

    const totalReports = reportCountRes.count ?? 0
    const otherReports = Math.max(0, totalReports - 1)

    const siteOrigin = process.env.NEXT_PUBLIC_SITE_ORIGIN?.trim() || MARGO_SITE_ORIGIN
    const postUrl = `${siteOrigin.replace(/\/$/, '')}/post/${encodeURIComponent(opts.postId)}`
    const adminReportsUrl = `${siteOrigin.replace(/\/$/, '')}/admin?section=reports`

    const text = buildReportEmailText({
      siteOrigin,
      reportId: opts.reportId,
      postId: opts.postId,
      reason: opts.reason,
      reasonNote: opts.reasonNote,
      reportedAtIso: opts.reportedAtIso,
      reporterHandle: profileHandle(reporter, opts.reporterId),
      reporterProfileId: opts.reporterId,
      authorHandle: profileHandle(author, post.author_profile_id ?? ''),
      postSnippet: typeof post.text === 'string' ? post.text : '',
      postKind: post.parent_post_id ? 'Lyric Back' : 'Normal post',
      lyricBackDepth: post.parent_post_id ? depth : null,
      postUrl,
      adminReportsUrl,
      otherReportsOnPost: otherReports,
    })

    const subject = buildReportEmailSubject(opts.reason, opts.postId)
    const result = await sendResendPlainEmail({
      apiKey,
      from,
      to,
      subject,
      text,
    })
    if (!result.ok) {
      return { status: 'failed', reason: result.reason }
    }

    await consumeHourlyApiRateLimit({
      route: 'report-email',
      bucket: 'global',
      limit: EMAILS_PER_HOUR,
      failOpenOnDbError: true,
    })

    return { status: 'sent' }
  } catch (err) {
    const name = err instanceof Error ? err.name : 'unknown_error'
    return { status: 'failed', reason: sanitizeEmailSingleLine(name, 40) }
  }
}

/** Await up to REPORT_EMAIL_TIMEOUT_MS; report API still returns ok if email fails or times out. */
export async function runReportEmailAfterInsert(opts: ReportEmailJobInput): Promise<void> {
  await awaitReportEmailJobWithTimeout(opts.reportId, () => runReportEmailJob(opts), REPORT_EMAIL_TIMEOUT_MS)
}
