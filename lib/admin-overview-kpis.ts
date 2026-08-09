import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { nowMs } from '@/lib/perf-trace'

export const GROWTH_TIMEZONE = 'Africa/Kigali' as const
export const GROWTH_SIGNUP_WINDOW_DAYS = 30 as const

export type AdminGrowthDay = { date: string; count: number }

export type AdminGrowthKpis = {
  signupsTotal: number
  postsActive: number
  postsAll: number
  lyricBacksActive: number
  lyricBacksAll: number
  signupsByDay: AdminGrowthDay[]
  windowDays: typeof GROWTH_SIGNUP_WINDOW_DAYS
  timezone: typeof GROWTH_TIMEZONE
}

export type AdminOverviewKpis = {
  pendingReports: number
  pendingArtistApps: number
  flaggedPosts: number
  hiddenPosts: number
  liveSongs: number
  approvedArtists: number
  artistsNeedingAttention: number
  featuredStatus: 'live' | 'incomplete'
  growth: AdminGrowthKpis
}

export type AdminOverviewKpisResult =
  | { ok: true; data: AdminOverviewKpis; queryMs: Record<string, number> }
  | { ok: false; error: string }

/** YYYY-MM-DD in Africa/Kigali */
export function kigaliDateKey(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: GROWTH_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

function buildEmptySignupsByDay(windowDays: number, end = new Date()): AdminGrowthDay[] {
  // Walk back windowDays calendar days in Kigali, inclusive of today.
  const keys: string[] = []
  // Use noon UTC offsets avoided by formatting "today" in Kigali and subtracting days via Date.UTC on the key parts
  const todayKey = kigaliDateKey(end)
  const [y, m, day] = todayKey.split('-').map(Number)
  const cursor = new Date(Date.UTC(y, m - 1, day))
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(cursor)
    d.setUTCDate(cursor.getUTCDate() - i)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
    keys.push(key)
  }
  return keys.map((date) => ({ date, count: 0 }))
}

async function fetchSignupsByDay(
  admin: ReturnType<typeof getSupabaseAdmin>,
  windowDays: number,
): Promise<{ days: AdminGrowthDay[]; ms: number; error: string | null }> {
  const t0 = nowMs()
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)
  // Floor to start of window with a day of slack so TZ edges don't drop early hours
  since.setUTCDate(since.getUTCDate() - 1)

  const counts = new Map<string, number>()
  const pageSize = 1000
  let from = 0

  for (;;) {
    const { data, error } = await admin
      .from('profiles')
      .select('created_at')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) {
      return { days: [], ms: Math.round(nowMs() - t0), error: error.message }
    }
    const rows = data || []
    for (const row of rows) {
      const key = kigaliDateKey(String(row.created_at))
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    if (rows.length < pageSize) break
    from += pageSize
    // Safety cap — overview shouldn't scan unbounded history of new profiles
    if (from > 50_000) break
  }

  const days = buildEmptySignupsByDay(windowDays)
  for (const day of days) {
    day.count = counts.get(day.date) || 0
  }

  return { days, ms: Math.round(nowMs() - t0), error: null }
}

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

  const signupsTotalP = runCount('signupsTotal', () =>
    admin.from('profiles').select('id', { count: 'exact', head: true }),
  )
  const postsActiveP = runCount('postsActive', () =>
    admin
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .is('parent_post_id', null)
      .eq('status', 'active'),
  )
  const postsAllP = runCount('postsAll', () =>
    admin.from('posts').select('id', { count: 'exact', head: true }).is('parent_post_id', null),
  )
  const lyricBacksActiveP = runCount('lyricBacksActive', () =>
    admin
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .not('parent_post_id', 'is', null)
      .eq('status', 'active'),
  )
  const lyricBacksAllP = runCount('lyricBacksAll', () =>
    admin.from('posts').select('id', { count: 'exact', head: true }).not('parent_post_id', 'is', null),
  )
  const signupsByDayP = fetchSignupsByDay(admin, GROWTH_SIGNUP_WINDOW_DAYS)

  const [
    pendingReportsRes,
    pendingAppsRes,
    flaggedPostsRes,
    hiddenPostsRes,
    liveSongsRes,
    approvedArtistsRes,
    artistsAttentionRes,
    featuredRes,
    signupsTotalRes,
    postsActiveRes,
    postsAllRes,
    lyricBacksActiveRes,
    lyricBacksAllRes,
    signupsByDayRes,
  ] = await Promise.all([
    pendingReportsP,
    pendingAppsP,
    flaggedPostsP,
    hiddenPostsP,
    liveSongsP,
    approvedArtistsP,
    artistsAttentionP,
    featuredP,
    signupsTotalP,
    postsActiveP,
    postsAllP,
    lyricBacksActiveP,
    lyricBacksAllP,
    signupsByDayP,
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
    signupsTotalRes.error,
    postsActiveRes.error,
    postsAllRes.error,
    lyricBacksActiveRes.error,
    lyricBacksAllRes.error,
    signupsByDayRes.error ? { message: signupsByDayRes.error } : null,
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
    signupsTotal: signupsTotalRes.ms,
    postsActive: postsActiveRes.ms,
    postsAll: postsAllRes.ms,
    lyricBacksActive: lyricBacksActiveRes.ms,
    lyricBacksAll: lyricBacksAllRes.ms,
    signupsByDay: signupsByDayRes.ms,
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
      growth: {
        signupsTotal: signupsTotalRes.count ?? 0,
        postsActive: postsActiveRes.count ?? 0,
        postsAll: postsAllRes.count ?? 0,
        lyricBacksActive: lyricBacksActiveRes.count ?? 0,
        lyricBacksAll: lyricBacksAllRes.count ?? 0,
        signupsByDay: signupsByDayRes.days,
        windowDays: GROWTH_SIGNUP_WINDOW_DAYS,
        timezone: GROWTH_TIMEZONE,
      },
    },
    queryMs,
  }
}
