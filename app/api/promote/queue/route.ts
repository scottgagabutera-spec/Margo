import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { getPromoteAdmin } from '@/lib/promote/admin-client'
import { requirePromoteSession } from '@/lib/promote/api-auth'
import { createPromoteQueueFromMoment } from '@/lib/promote/queue-from-moment'
import {
  isPromoteQueueItemVisible,
  PROMOTE_RESOLVED_RETENTION_MS,
  type PromotePlatform,
  type PromoteQueueRow,
  type PromoteQueueTargetRow,
} from '@/lib/promote/types'

const VALID_PLATFORMS = new Set<PromotePlatform>(['youtube', 'tiktok', 'instagram', 'facebook', 'x'])

function mapQueue(row: Record<string, unknown>, targets: Record<string, unknown>[]): PromoteQueueRow {
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    status: row.status as PromoteQueueRow['status'],
    sourceType: row.source_type as PromoteQueueRow['sourceType'],
    sourcePostId: (row.source_post_id as string | null) ?? null,
    sourceSongId: (row.source_song_id as string | null) ?? null,
    lyricText: String(row.lyric_text || ''),
    songTitle: String(row.song_title || ''),
    artistName: String(row.artist_name || ''),
    artworkUrl: (row.artwork_url as string | null) ?? null,
    snippetStartSec: row.snippet_start_sec != null ? Number(row.snippet_start_sec) : null,
    snippetEndSec: row.snippet_end_sec != null ? Number(row.snippet_end_sec) : null,
    defaultShapeId: row.default_shape_id as PromoteQueueRow['defaultShapeId'],
    defaultThemeId: row.default_theme_id as PromoteQueueRow['defaultThemeId'],
    defaultAtmosphereId: row.default_atmosphere_id as PromoteQueueRow['defaultAtmosphereId'],
    overrideShapeId: (row.override_shape_id as PromoteQueueRow['overrideShapeId']) ?? null,
    overrideThemeId: (row.override_theme_id as PromoteQueueRow['overrideThemeId']) ?? null,
    overrideAtmosphereId: (row.override_atmosphere_id as PromoteQueueRow['overrideAtmosphereId']) ?? null,
    renderedVideoUrl: (row.rendered_video_url as string | null) ?? null,
    selectionReason: (row.selection_reason as Record<string, unknown> | null) ?? null,
    reviewedAt: (row.reviewed_at as string | null) ?? null,
    createdAt: String(row.created_at),
    targets: targets.map((t) => ({
      id: String(t.id),
      platform: t.platform as PromoteQueueTargetRow['platform'],
      publishAdapter: t.publish_adapter === 'buffer' ? 'buffer' : 'direct',
      status: t.status as PromoteQueueTargetRow['status'],
      externalPostId: (t.external_post_id as string | null) ?? null,
      externalPostUrl: (t.external_post_url as string | null) ?? null,
      errorMessage: (t.error_message as string | null) ?? null,
      publishedAt: (t.published_at as string | null) ?? null,
    })),
  }
}

export async function GET() {
  const session = await requirePromoteSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = await createServerSupabase()
  const resolvedCutoff = new Date(Date.now() - PROMOTE_RESOLVED_RETENTION_MS).toISOString()
  const [activeRes, resolvedRes] = await Promise.all([
    supabase
      .from('promote_queue')
      .select('*')
      .eq('profile_id', session.userId)
      .in('status', ['pending_review', 'approved', 'publishing', 'partial'])
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('promote_queue')
      .select('*')
      .eq('profile_id', session.userId)
      .in('status', ['published', 'failed', 'rejected'])
      .gte('updated_at', resolvedCutoff)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  if (activeRes.error) return NextResponse.json({ error: activeRes.error.message }, { status: 500 })
  if (resolvedRes.error) return NextResponse.json({ error: resolvedRes.error.message }, { status: 500 })

  const visible = [...(activeRes.data || []), ...(resolvedRes.data || [])]
    .filter((row) => isPromoteQueueItemVisible(String(row.status), row.updated_at as string | null))
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
  if (!visible.length) return NextResponse.json({ items: [] })

  const ids = visible.map((r) => r.id)
  const { data: targets, error: targetErr } = await supabase
    .from('promote_queue_targets')
    .select('*')
    .in('queue_id', ids)

  if (targetErr) return NextResponse.json({ error: targetErr.message }, { status: 500 })

  const byQueue = new Map<string, Record<string, unknown>[]>()
  for (const t of targets || []) {
    const list = byQueue.get(t.queue_id as string) || []
    list.push(t)
    byQueue.set(t.queue_id as string, list)
  }

  return NextResponse.json({
    items: visible.map((row) => mapQueue(row, byQueue.get(row.id as string) || [])),
  })
}

export async function POST(request: Request) {
  const session = await requirePromoteSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { postId?: string; platforms?: unknown; confirmRepublish?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!body.postId) {
    return NextResponse.json({ error: 'postId is required' }, { status: 400 })
  }

  const platforms = Array.isArray(body.platforms)
    ? body.platforms.filter((p): p is PromotePlatform => typeof p === 'string' && VALID_PLATFORMS.has(p as PromotePlatform))
    : []
  if (platforms.length === 0) {
    return NextResponse.json({ error: 'Select at least one platform.' }, { status: 400 })
  }

  const confirmRepublish = body.confirmRepublish === true

  const admin = getPromoteAdmin()
  if (!admin) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  const { data: settings } = await admin
    .from('artist_promote_settings')
    .select('publish_mode')
    .eq('profile_id', session.userId)
    .maybeSingle()

  const publishMode = settings?.publish_mode === 'auto' ? 'auto' : 'review'

  try {
    const result = await createPromoteQueueFromMoment(admin, {
      profileId: session.userId,
      postId: body.postId,
      publishMode,
      platforms,
      confirmRepublish,
    })
    return NextResponse.json(result)
  } catch (err) {
    if (
      err instanceof Error
      && 'code' in err
      && (err as Error & { code?: string }).code === 'REPUBLISH_CONFIRM_REQUIRED'
    ) {
      return NextResponse.json({
        error: err.message,
        needsConfirm: true,
        republishPlatforms: (err as Error & { republishPlatforms?: string[] }).republishPlatforms || [],
      }, { status: 409 })
    }
    const message = err instanceof Error ? err.message : 'Failed to queue Moment'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
