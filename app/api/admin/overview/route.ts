import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { nowMs, perfLog, perfRequested } from '@/lib/perf-trace'

/**
 * Glance KPIs for admin overview — exact service-role counts (not list caps).
 * Artist KPIs use real columns profiles.is_artist + profiles.artist_status
 * (migration 20260731_artist_approval_trigger.sql).
 *
 * Diagnosis: pass ?perf=1 or header x-margo-perf: 1 to include `_perf` timing
 * breakdown (assertAdmin + each count query). Temporary — remove after profiling.
 */
export async function GET(request: Request) {
  const wantPerf = perfRequested(request)
  const tRoute0 = nowMs()

  const gate = await assertAdmin({ perf: wantPerf })
  if (!gate.ok) {
    if (wantPerf && gate._perf) {
      perfLog('admin/overview.assertAdmin.fail', gate._perf)
    }
    return gate.res
  }

  try {
    const admin = getSupabaseAdmin()

    const runCount = async (label: string, build: () => PromiseLike<{ count: number | null; error: { message: string } | null }>) => {
      const t0 = nowMs()
      const res = await build()
      return { label, ms: Math.round(nowMs() - t0), count: res.count, error: res.error }
    }

    const pendingReportsP = runCount('pendingReports', () =>
      admin.from('post_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    )
    const pendingAppsP = runCount('pendingArtistApps', () =>
      admin.from('artist_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    )
    const flaggedPostsP = runCount('flaggedPosts', () =>
      admin
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .is('parent_post_id', null)
        .gt('flag_count', 0),
    )
    const hiddenPostsP = runCount('hiddenPosts', () =>
      admin
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .is('parent_post_id', null)
        .eq('status', 'hidden'),
    )
    const liveSongsP = runCount('liveSongs', () =>
      admin.from('songs').select('id', { count: 'exact', head: true }).eq('status', 'live'),
    )
    const approvedArtistsP = runCount('approvedArtists', () =>
      admin.from('profiles').select('id', { count: 'exact', head: true }).eq('is_artist', true),
    )
    const artistsAttentionP = runCount('artistsNeedingAttention', () =>
      admin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('is_artist', true)
        .in('artist_status', ['warned', 'frozen', 'removed']),
    )

    const featuredP = (async () => {
      const t0 = nowMs()
      const res = await admin
        .from('site_featured_exchange')
        .select('post_text, reply_text')
        .eq('id', 1)
        .maybeSingle()
      return { label: 'featured', ms: Math.round(nowMs() - t0), data: res.data, error: res.error }
    })()

    const [
      pendingReportsRes,
      pendingAppsRes,
      flaggedPostsRes,
      hiddenPostsRes,
      liveSongsRes,
      approvedArtistsRes,
      artistsAttentionRes,
      featuredRes,
    ] = await Promise.all([
      pendingReportsP,
      pendingAppsP,
      flaggedPostsP,
      hiddenPostsP,
      liveSongsP,
      approvedArtistsP,
      artistsAttentionP,
      featuredP,
    ])

    const failures = [
      pendingReportsRes.error,
      pendingAppsRes.error,
      flaggedPostsRes.error,
      hiddenPostsRes.error,
      liveSongsRes.error,
      approvedArtistsRes.error,
      artistsAttentionRes.error,
      featuredRes.error,
    ].filter(Boolean)

    if (failures.length) {
      console.error('[admin/overview] query failed:', failures.map((e) => e!.message).join('; '))
      return NextResponse.json({ error: failures[0]!.message }, { status: 500 })
    }

    const postText = String(featuredRes.data?.post_text ?? '').trim()
    const replyText = String(featuredRes.data?.reply_text ?? '').trim()
    const featuredStatus: 'live' | 'incomplete' =
      postText && replyText ? 'live' : 'incomplete'

    const body: Record<string, unknown> = {
      pendingReports: pendingReportsRes.count ?? 0,
      pendingArtistApps: pendingAppsRes.count ?? 0,
      flaggedPosts: flaggedPostsRes.count ?? 0,
      hiddenPosts: hiddenPostsRes.count ?? 0,
      liveSongs: liveSongsRes.count ?? 0,
      approvedArtists: approvedArtistsRes.count ?? 0,
      artistsNeedingAttention: artistsAttentionRes.count ?? 0,
      featuredStatus,
    }

    if (wantPerf) {
      const queryMs: Record<string, number> = {
        pendingReports: pendingReportsRes.ms,
        pendingArtistApps: pendingAppsRes.ms,
        flaggedPosts: flaggedPostsRes.ms,
        hiddenPosts: hiddenPostsRes.ms,
        liveSongs: liveSongsRes.ms,
        approvedArtists: approvedArtistsRes.ms,
        artistsNeedingAttention: artistsAttentionRes.ms,
        featured: featuredRes.ms,
      }
      const queryValues = Object.values(queryMs)
      const _perf = {
        assertAdmin: gate._perf ?? null,
        queryMs,
        slowestQueryMs: Math.max(...queryValues),
        parallelQueriesMs: Math.max(...queryValues),
        handlerTotalMs: Math.round(nowMs() - tRoute0),
      }
      body._perf = _perf
      perfLog('admin/overview', _perf)
    }

    return NextResponse.json(body)
  } catch (e: any) {
    console.error('[admin/overview] failed:', e)
    return NextResponse.json({ error: e?.message || 'Failed to load overview' }, { status: 500 })
  }
}
