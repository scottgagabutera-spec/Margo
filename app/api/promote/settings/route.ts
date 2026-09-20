import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { getPromoteAdmin } from '@/lib/promote/admin-client'
import { requirePromoteSession } from '@/lib/promote/api-auth'
import type { PromoteCadence, PromotePublishMode } from '@/lib/promote/types'

function mapSettings(row: Record<string, unknown>) {
  return {
    publishMode: row.publish_mode as PromotePublishMode,
    enabled: Boolean(row.enabled),
    cadence: row.cadence as PromoteCadence,
    maxPostsPerRun: Number(row.max_posts_per_run ?? 1),
    lastRunAt: (row.last_run_at as string | null) ?? null,
    nextRunAt: (row.next_run_at as string | null) ?? null,
  }
}

export async function GET() {
  const session = await requirePromoteSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = await createServerSupabase()
  const { data, error } = await supabase
    .from('artist_promote_settings')
    .select('*')
    .eq('profile_id', session.userId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!data) {
    return NextResponse.json({
      settings: {
        publishMode: 'review' as PromotePublishMode,
        enabled: false,
        cadence: 'manual' as PromoteCadence,
        maxPostsPerRun: 1,
        lastRunAt: null,
        nextRunAt: null,
      },
    })
  }

  return NextResponse.json({ settings: mapSettings(data) })
}

export async function PATCH(request: Request) {
  const session = await requirePromoteSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: {
    publishMode?: PromotePublishMode
    enabled?: boolean
    cadence?: PromoteCadence
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.publishMode === 'auto' || body.publishMode === 'review') {
    patch.publish_mode = body.publishMode
  }
  if (typeof body.enabled === 'boolean') patch.enabled = body.enabled
  if (body.cadence === 'daily' || body.cadence === 'weekly' || body.cadence === 'manual') {
    patch.cadence = body.cadence
  }

  const admin = getPromoteAdmin()
  if (!admin) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  const { data, error } = await admin
    .from('artist_promote_settings')
    .upsert({ profile_id: session.userId, ...patch }, { onConflict: 'profile_id' })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ settings: mapSettings(data) })
}
