import type { SupabaseClient } from '@supabase/supabase-js'
import { consumeHourlyApiRateLimit } from '@/lib/api-rate-limit'
import type { PostReportReason } from '@/lib/post-report'
import { MARGO_SITE_ORIGIN } from '@/lib/moment/site-origin'
import {
  buildReportEmailSubject,
  buildReportEmailText,
  sanitizeEmailSingleLine,
  scheduleReportEmailSend,
  sendResendPlainEmail,
  shortPostId,
} from '@/lib/report-email'

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

export async function loadAndSendReportEmail(opts: {
  admin: SupabaseClient
  reportId: string
  postId: string
  reason: PostReportReason
  reasonNote: string | null
  reporterId: string
  reportedAtIso: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const to = process.env.REPORT_EMAIL_TO?.trim()
  const from = process.env.REPORT_EMAIL_FROM?.trim()
  if (!apiKey || !to) {
    console.info('[report-email] skipped: RESEND_API_KEY or REPORT_EMAIL_TO not configured')
    return
  }
  if (!from) {
    console.info('[report-email] skipped: REPORT_EMAIL_FROM not configured')
    return
  }

  const limited = await consumeHourlyApiRateLimit({
    route: 'report-email',
    bucket: 'global',
    limit: EMAILS_PER_HOUR,
    failOpenOnDbError: true,
  })
  if (!limited.ok) {
    console.error('[report-email] skipped: hourly email cap reached')
    return
  }

  const { data: post, error: postErr } = await opts.admin
    .from('posts')
    .select('id, text, parent_post_id, author_profile_id')
    .eq('id', opts.postId)
    .maybeSingle()
  if (postErr || !post) {
    console.error('[report-email] post load failed:', postErr?.message ?? 'missing')
    return
  }

  const [{ data: reporter }, { data: author }, depth, reportCountRes] = await Promise.all([
    opts.admin.from('profiles').select('username, display_name').eq('id', opts.reporterId).maybeSingle(),
    opts.admin.from('profiles').select('username, display_name').eq('id', post.author_profile_id).maybeSingle(),
    lyricBackDepth(opts.admin, post.parent_post_id),
    opts.admin
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
    console.error('[report-email] resend failed:', result.reason)
  }
}

export function enqueueReportEmail(opts: {
  admin: SupabaseClient
  reportId: string
  postId: string
  reason: PostReportReason
  reasonNote: string | null
  reporterId: string
  reportedAtIso: string
}): void {
  scheduleReportEmailSend(() => loadAndSendReportEmail(opts))
}
