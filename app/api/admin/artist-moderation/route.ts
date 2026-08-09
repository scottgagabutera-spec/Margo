import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

type ArtistStatus = 'active' | 'warned' | 'frozen' | 'removed'
type NotifyType = 'warned' | 'frozen' | 'removed' | 'restored'

async function notifyProfile(
  admin: ReturnType<typeof getSupabaseAdmin>,
  recipientId: string,
  type: NotifyType,
  actorId: string,
) {
  const { error } = await admin.from('notifications').insert({
    recipient_id: recipientId,
    actor_id: actorId,
    type,
  })
  if (error) console.error('[admin/artist-moderation] notify failed:', error.message)
}

/**
 * GET — list profiles where is_artist = true (all moderation standings).
 */
export async function GET() {
  const gate = await assertAdmin()
  if (!gate.ok) return gate.res

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('profiles')
    .select(
      'id, username, display_name, avatar_url, artist_status, artist_status_reason, artist_status_updated_at',
    )
    .eq('is_artist', true)
    .order('artist_status_updated_at', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('[admin/artist-moderation] GET failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ artists: data ?? [] })
}

/**
 * PATCH — set artist_status. Body:
 *   { id, status: 'active'|'warned'|'frozen'|'removed', reason?: string | null }
 */
export async function PATCH(request: NextRequest) {
  const gate = await assertAdmin()
  if (!gate.ok) return gate.res

  const body = await request.json().catch(() => null)
  const id = typeof body?.id === 'string' ? body.id.trim() : ''
  const status = body?.status as ArtistStatus | undefined
  const reasonRaw = body?.reason
  const reason =
    reasonRaw === null || reasonRaw === undefined
      ? null
      : typeof reasonRaw === 'string'
        ? reasonRaw.trim() || null
        : null

  if (!id || !status || !['active', 'warned', 'frozen', 'removed'].includes(status)) {
    return NextResponse.json(
      { error: 'id and status (active|warned|frozen|removed) required' },
      { status: 400 },
    )
  }

  if (status !== 'active' && !reason) {
    return NextResponse.json(
      { error: 'reason required for warn/freeze/remove' },
      { status: 400 },
    )
  }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('profiles')
    .update({
      artist_status: status,
      artist_status_reason: status === 'active' ? null : reason,
      artist_status_updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('is_artist', true)
    .select('id, artist_status, artist_status_reason')
    .maybeSingle()

  if (error) {
    console.error('[admin/artist-moderation] PATCH failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Artist profile not found' }, { status: 404 })
  }

  const notifyType: NotifyType =
    status === 'active' ? 'restored' : (status as NotifyType)
  await notifyProfile(admin, id, notifyType, gate.userId)

  return NextResponse.json({
    id: data.id,
    artist_status: data.artist_status,
    artist_status_reason: data.artist_status_reason,
  })
}
