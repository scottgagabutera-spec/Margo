import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { nowMs } from '@/lib/perf-trace'

export type AdminOverviewKpis = {
  pendingReports: number
  pendingArtistApps: number
  flaggedPosts: number
  hiddenPosts: number
  liveSongs: number
  approvedArtists: number
  artistsNeedingAttention: number
  featuredStatus: 'live' | 'incomplete'
}

export type AdminOverviewKpisResult =
  | { ok: true; data: AdminOverviewKpis; queryMs: Record<string, number> }
  | { ok: false; error: string }

/**
 * Exact service-role KPI pack for admin Overview.
 * Shared by GET /api/admin/overview and GET /api/admin/session?overview=1.
 */
export async function fetchAdminOverviewKpis(): Promise<AdminOverviewKpisResult> {
  const admin = getSupabaseAdmin()

  const runCount = async (
    label: string,
    build: () => PromiseLike<{ count: number | null; error: { message: string } | null }>,
  ) => {
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
    return { ok: false, error: failures[0]!.message }
  }

  const postText = String(featuredRes.data?.post_text ?? '').trim()
  const replyText = String(featuredRes.data?.reply_text ?? '').trim()
  const featuredStatus: 'live' | 'incomplete' =
    postText && replyText ? 'live' : 'incomplete'

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

  return {
    ok: true,
    data: {
      pendingReports: pendingReportsRes.count ?? 0,
      pendingArtistApps: pendingAppsRes.count ?? 0,
      flaggedPosts: flaggedPostsRes.count ?? 0,
      hiddenPosts: hiddenPostsRes.count ?? 0,
      liveSongs: liveSongsRes.count ?? 0,
      approvedArtists: approvedArtistsRes.count ?? 0,
      artistsNeedingAttention: artistsAttentionRes.count ?? 0,
      featuredStatus,
    },
    queryMs,
  }
}
