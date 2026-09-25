import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { requirePromoteSession } from '@/lib/promote/api-auth'

const DISMISSABLE_STATUSES = [
  'pending_review',
  'approved',
  'published',
  'partial',
  'failed',
  'rejected',
] as const

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requirePromoteSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await context.params
  const supabase = await createServerSupabase()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('promote_queue')
    .update({ status: 'cancelled', updated_at: now })
    .eq('id', id)
    .eq('profile_id', session.userId)
    .in('status', [...DISMISSABLE_STATUSES])
    .select('id')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) {
    return NextResponse.json(
      { error: 'Cannot remove this item (not found or still publishing).' },
      { status: 404 },
    )
  }

  return NextResponse.json({ ok: true })
}
