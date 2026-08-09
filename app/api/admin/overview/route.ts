import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

/**
 * Glance KPIs for admin overview — exact service-role counts (not list caps).
 * KPI #6 uses real columns profiles.is_artist + profiles.artist_status
 * (migration 20260731_artist_approval_trigger.sql).
 */
export async function GET() {
  const gate = await assertAdmin()
  if (!gate.ok) return gate.res

  try {
    const admin = getSupabaseAdmin()

    const pendingReportsQ = admin
      .from('post_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')

    const pendingAppsQ = admin
      .from('artist_applications')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')

    const flaggedPostsQ = admin
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .is('parent_post_id', null)
      .gt('flag_count', 0)

    const hiddenPostsQ = admin
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .is('parent_post_id', null)
      .eq('status', 'hidden')

    const liveSongsQ = admin
      .from('songs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'live')

    const artistsAttentionQ = admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_artist', true)
      .in('artist_status', ['warned', 'frozen', 'removed'])

    const featuredQ = admin
      .from('site_featured_exchange')
      .select('post_text, reply_text')
      .eq('id', 1)
      .maybeSingle()

    const [
      pendingReportsRes,
      pendingAppsRes,
      flaggedPostsRes,
      hiddenPostsRes,
      liveSongsRes,
      artistsAttentionRes,
      featuredRes,
    ] = await Promise.all([
      pendingReportsQ,
      pendingAppsQ,
      flaggedPostsQ,
      hiddenPostsQ,
      liveSongsQ,
      artistsAttentionQ,
      featuredQ,
    ])

    const failures = [
      pendingReportsRes.error,
      pendingAppsRes.error,
      flaggedPostsRes.error,
      hiddenPostsRes.error,
      liveSongsRes.error,
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

    return NextResponse.json({
      pendingReports: pendingReportsRes.count ?? 0,
      pendingArtistApps: pendingAppsRes.count ?? 0,
      flaggedPosts: flaggedPostsRes.count ?? 0,
      hiddenPosts: hiddenPostsRes.count ?? 0,
      liveSongs: liveSongsRes.count ?? 0,
      artistsNeedingAttention: artistsAttentionRes.count ?? 0,
      featuredStatus,
    })
  } catch (e: any) {
    console.error('[admin/overview] failed:', e)
    return NextResponse.json({ error: e?.message || 'Failed to load overview' }, { status: 500 })
  }
}
