import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { requirePromoteSession } from '@/lib/promote/api-auth'

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requirePromoteSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await context.params
  let body: {
    overrideThemeId?: string | null
    overrideAtmosphereId?: string | null
    overrideShapeId?: string | null
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.overrideThemeId !== undefined) patch.override_theme_id = body.overrideThemeId
  if (body.overrideAtmosphereId !== undefined) patch.override_atmosphere_id = body.overrideAtmosphereId
  if (body.overrideShapeId !== undefined) patch.override_shape_id = body.overrideShapeId

  const supabase = await createServerSupabase()
  const { data, error } = await supabase
    .from('promote_queue')
    .update(patch)
    .eq('id', id)
    .eq('profile_id', session.userId)
    .eq('status', 'pending_review')
    .select('id')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Queue item not found or not editable' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
