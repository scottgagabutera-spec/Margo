import { NextResponse } from 'next/server'
import { assembleMemoriesPublicBatch } from '@/lib/memory/assemble-batch'
import { MEMORY_ROW_SELECT } from '@/lib/memory/columns'
import { buildListeningWeekRows } from '@/lib/feed-listening-week'
import { inferListeningPeriodType } from '@/lib/memory/listening-infer'
import { weekRangeContaining } from '@/lib/memory/listening-period'
import { createClient } from '@/lib/supabase/server'

const CACHE = { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' }
const SCAN = 48

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { startIso, endIso } = weekRangeContaining(new Date())

  let query = supabase
    .from('memories')
    .select(MEMORY_ROW_SELECT)
    .eq('visibility', 'public')
    .is('content_removed_at', null)
    .eq('date_granularity', 'period')
    .gte('date_end', startIso)
    .lte('date_start', endIso)
    .order('created_at', { ascending: false })
    .limit(SCAN)

  const { data: rows, error } = await query
  if (error) {
    console.error('[memories/listening-week]', error)
    return NextResponse.json({ rows: [] }, { headers: CACHE })
  }

  const assembled = await assembleMemoriesPublicBatch(rows || [], user?.id ?? null)
  const listening = assembled.filter(
    (m) =>
      inferListeningPeriodType({
        dateGranularity: m.dateGranularity,
        dateStart: m.dateStart,
        dateEnd: m.dateEnd,
        songCount: m.songCount,
        photoCount: m.photos.length,
      }) === 'week',
  )

  let followingIds = new Set<string>()
  if (user?.id) {
    const { data: follows } = await supabase
      .from('follows')
      .select('followee_id')
      .eq('follower_id', user.id)
      .eq('status', 'accepted')
    followingIds = new Set((follows || []).map((f) => f.followee_id as string))
  }

  const weekRows = buildListeningWeekRows({
    memories: listening,
    followingIds,
    max: 5,
  })

  return NextResponse.json({ rows: weekRows }, { headers: CACHE })
}
