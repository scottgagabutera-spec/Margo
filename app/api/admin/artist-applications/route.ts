import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

type NotifyType =
  | 'artist_approved'
  | 'artist_rejected'
  | 'warned'
  | 'frozen'
  | 'removed'
  | 'restored'

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
  if (error) console.error('[admin/artist-applications] notify failed:', error.message)
}

/**
 * GET — list artist applications (service role; includes all statuses).
 */
export async function GET() {
  const gate = await assertAdmin()
  if (!gate.ok) return gate.res

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('artist_applications')
    .select('*, profiles!artist_applications_profile_id_fkey(username, avatar_url)')
    .order('submitted_at', { ascending: false })

  if (error) {
    console.error('[admin/artist-applications] GET failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const applications = (data ?? []).map((row: any) => ({
    id: row.id,
    profile_id: row.profile_id,
    status: row.status,
    display_artist_name: row.display_artist_name,
    links: row.links ?? {},
    note: row.note ?? null,
    rights_agreed: row.rights_agreed,
    submitted_at: row.submitted_at,
    reviewed_at: row.reviewed_at ?? null,
    username: row.profiles?.username,
    avatar_url: row.profiles?.avatar_url ?? null,
  }))

  return NextResponse.json({ applications })
}

/**
 * PATCH — approve or reject. Body: { id, status: 'approved' | 'rejected' }
 * DB trigger flips is_artist on approve.
 */
export async function PATCH(request: NextRequest) {
  const gate = await assertAdmin()
  if (!gate.ok) return gate.res

  const body = await request.json().catch(() => null)
  const id = typeof body?.id === 'string' ? body.id.trim() : ''
  const status = body?.status as string | undefined
  if (!id || !status || !['approved', 'rejected'].includes(status)) {
    return NextResponse.json(
      { error: 'id and status (approved|rejected) required' },
      { status: 400 },
    )
  }

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('artist_applications')
    .update({ status })
    .eq('id', id)
    .select('id, profile_id, status')
    .maybeSingle()

  if (error) {
    console.error('[admin/artist-applications] PATCH failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 })
  }

  await notifyProfile(
    admin,
    data.profile_id,
    status === 'approved' ? 'artist_approved' : 'artist_rejected',
    gate.userId,
  )

  return NextResponse.json({ id: data.id, status: data.status })
}
