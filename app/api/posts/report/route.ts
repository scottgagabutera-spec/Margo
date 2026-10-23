import { NextRequest, NextResponse } from 'next/server'
import { consumeHourlyApiRateLimit } from '@/lib/api-rate-limit'
import { parsePostReportBody } from '@/lib/post-report'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const REPORTS_PER_HOUR = 40

async function requireUserId(): Promise<string | null> {
  const supabase = await createServerSupabase()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user?.id) return null
  return data.user.id
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }

  const limited = await consumeHourlyApiRateLimit({
    route: 'posts/report',
    bucket: userId,
    limit: REPORTS_PER_HOUR,
    failOpenOnDbError: true,
  })
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many reports. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } },
    )
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = parsePostReportBody(json)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status })
  }

  const admin = getSupabaseAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const { data: post, error: postErr } = await admin
    .from('posts')
    .select('id, author_profile_id')
    .eq('id', parsed.postId)
    .maybeSingle()

  if (postErr) {
    console.error('[posts/report] post lookup failed', postErr.message)
    return NextResponse.json({ error: 'Could not verify post' }, { status: 500 })
  }
  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }
  if (post.author_profile_id === userId) {
    return NextResponse.json({ error: 'You cannot report your own post' }, { status: 403 })
  }

  const insertRow: {
    post_id: string
    reporter_id: string
    reason: string
    reason_note?: string | null
  } = {
    post_id: parsed.postId,
    reporter_id: userId,
    reason: parsed.reason,
    reason_note: parsed.note,
  }

  const { data: inserted, error: insertErr } = await admin
    .from('post_reports')
    .insert(insertRow)
    .select('id')
    .maybeSingle()

  if (insertErr) {
    const msg = insertErr.message || ''
    const code = (insertErr as { code?: string }).code
    if (code === '23505' || msg.toLowerCase().includes('duplicate') || msg.includes('unique')) {
      return NextResponse.json({ error: 'already_reported', code: 'already_reported' }, { status: 409 })
    }
    console.error('[posts/report] insert failed', insertErr.message)
    return NextResponse.json({ error: 'Could not send report' }, { status: 500 })
  }

  const reportId = inserted?.id

  // TODO(report-email): enqueue moderation inbox email here (non-blocking).
  // Example: void notifyModerationReportEmail({ reportId, postId: parsed.postId, reason: parsed.reason, ... })

  return NextResponse.json({ ok: true, reportId: reportId ?? null })
}
