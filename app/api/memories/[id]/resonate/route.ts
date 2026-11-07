import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assembleMemoryPublic } from '@/lib/memory/assemble'
import { MEMORY_ROW_SELECT } from '@/lib/memory/columns'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const { data: memory } = await supabase
    .from('memories')
    .select(MEMORY_ROW_SELECT)
    .eq('id', id)
    .is('content_removed_at', null)
    .maybeSingle()
  if (!memory) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: existing } = await supabase
    .from('memory_resonates')
    .select('memory_id')
    .eq('memory_id', id)
    .eq('actor_id', user.id)
    .maybeSingle()

  if (existing) {
    await supabase.from('memory_resonates').delete().eq('memory_id', id).eq('actor_id', user.id)
  } else {
    const { error: insErr } = await supabase.from('memory_resonates').insert({
      memory_id: id,
      actor_id: user.id,
    })
    if (insErr) {
      return NextResponse.json({ error: 'Could not resonate' }, { status: 400 })
    }
  }

  const { data: fresh } = await supabase.from('memories').select(MEMORY_ROW_SELECT).eq('id', id).maybeSingle()
  const pub = fresh ? await assembleMemoryPublic(fresh, user.id) : null
  return NextResponse.json({ memory: pub })
}
