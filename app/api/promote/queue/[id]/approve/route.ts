import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { requirePromoteSession } from '@/lib/promote/api-auth'

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requirePromoteSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await context.params
  const supabase = await createServerSupabase()
  const { data, error } = await supabase
    .from('promote_queue')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('profile_id', session.userId)
    .eq('status', 'pending_review')
    .select('id')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Queue item not found' }, { status: 404 })
  return NextResponse.json({ ok: true, queueId: data.id })
}
