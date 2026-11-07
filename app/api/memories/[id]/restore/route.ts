import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { assembleMemoryPublic } from '@/lib/memory/assemble'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { data: row, error: updErr } = await admin
    .from('memories')
    .update({ content_removed_at: null })
    .eq('id', id)
    .eq('owner_profile_id', user.id)
    .not('content_removed_at', 'is', null)
    .select('*')
    .maybeSingle()

  if (updErr || !row) {
    return NextResponse.json({ error: 'Could not restore' }, { status: 400 })
  }

  const pub = await assembleMemoryPublic(row, user.id)
  return NextResponse.json({ memory: pub })
}
