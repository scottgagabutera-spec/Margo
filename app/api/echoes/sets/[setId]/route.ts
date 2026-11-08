import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { loadEchoSetAnswers } from '@/lib/echoes/load-active'

async function followingIds(userId: string): Promise<string[]> {
  const admin = getSupabaseAdmin()
  const { data } = await admin.from('follows').select('following_id').eq('follower_id', userId)
  return (data ?? []).map((r) => r.following_id as string)
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ setId: string }> },
) {
  const { setId } = await ctx.params
  const filterRaw = request.nextUrl.searchParams.get('filter')?.trim().toLowerCase()
  const filter = filterRaw === 'everyone' ? 'everyone' : 'following'

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const following = user ? await followingIds(user.id) : []
    const limitRaw = Number(request.nextUrl.searchParams.get('limit'))
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 120
    const payload = await loadEchoSetAnswers(setId, user?.id ?? null, filter, following, limit)
    if (!payload) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(payload)
  } catch (e) {
    console.error('[echoes/sets]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
