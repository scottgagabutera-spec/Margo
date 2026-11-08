import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { loadEchoPersonAnswer } from '@/lib/echoes/load-active'

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ setId: string; profileId: string }> },
) {
  const { setId, profileId } = await ctx.params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const payload = await loadEchoPersonAnswer(setId, profileId, user?.id ?? null)
    if (!payload) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const admin = getSupabaseAdmin()
    const { data: profile } = await admin
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('id', profileId)
      .maybeSingle()
    return NextResponse.json({ ...payload, profile })
  } catch (e) {
    console.error('[echoes/profile]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
