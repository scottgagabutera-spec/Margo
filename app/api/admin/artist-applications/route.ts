import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { insertAppNotification } from '@/lib/notifications/insert-app-notification'
import {
  collectValidArtistLinks,
  linkHostLabel,
} from '@/lib/artist-application-links'

const APPLICATION_COLUMNS =
  'id, profile_id, status, display_artist_name, links, note, rights_agreed, submitted_at, reviewed_at, applicant_type, verification_method, verification_code, verified_at'

/**
 * GET — list artist applications (service role; includes all statuses).
 */
export async function GET() {
  const gate = await assertAdmin()
  if (!gate.ok) return gate.res

  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('artist_applications')
    .select(
      `${APPLICATION_COLUMNS}, profiles!artist_applications_profile_id_fkey(username, avatar_url, display_name, created_at)`,
    )
    .order('submitted_at', { ascending: false })

  if (error) {
    console.error('[admin/artist-applications] GET failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = data ?? []
  const profileIds = [...new Set(rows.map((r) => r.profile_id as string))]

  const followerCounts = new Map<string, number>()
  if (profileIds.length > 0) {
    const { data: follows } = await admin
      .from('follows')
      .select('followee_id')
      .eq('status', 'accepted')
      .in('followee_id', profileIds)
    for (const row of follows ?? []) {
      const id = row.followee_id as string
      followerCounts.set(id, (followerCounts.get(id) ?? 0) + 1)
    }
  }

  const applications = rows.map((row) => {
    const links = (row.links ?? {}) as Record<string, string>
    const validUrls = collectValidArtistLinks(links)
    const profile = row.profiles as {
      username?: string
      avatar_url?: string | null
      display_name?: string
      created_at?: string
    } | null

    return {
      id: row.id,
      profile_id: row.profile_id,
      status: row.status,
      display_artist_name: row.display_artist_name,
      links,
      link_items: validUrls.map((url) => ({ url, label: linkHostLabel(url) })),
      valid_link_count: validUrls.length,
      note: row.note ?? null,
      rights_agreed: row.rights_agreed,
      submitted_at: row.submitted_at,
      reviewed_at: row.reviewed_at ?? null,
      applicant_type: row.applicant_type ?? null,
      verification_method: row.verification_method ?? null,
      verification_code: row.verification_code ?? null,
      verified_at: row.verified_at ?? null,
      username: profile?.username ?? null,
      avatar_url: profile?.avatar_url ?? null,
      profile_display_name: profile?.display_name ?? null,
      profile_created_at: profile?.created_at ?? null,
      follower_count: followerCounts.get(row.profile_id as string) ?? 0,
    }
  })

  return NextResponse.json({ applications })
}

/**
 * PATCH — approve or reject. Body: { id, status: 'approved' | 'rejected' }
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
    .select('id, profile_id, status, display_artist_name')
    .maybeSingle()

  if (error) {
    console.error('[admin/artist-applications] PATCH failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 })
  }

  if (status === 'rejected') {
    const { data: otherApproved } = await admin
      .from('artist_applications')
      .select('id')
      .eq('profile_id', data.profile_id)
      .eq('status', 'approved')
      .limit(1)

    if (!otherApproved?.length) {
      await admin.from('profiles').update({ is_artist: false }).eq('id', data.profile_id)
    }
  }

  await insertAppNotification(admin, {
    recipientId: data.profile_id,
    type: status === 'approved' ? 'artist_approved' : 'artist_rejected',
    actorId: gate.userId,
  })

  return NextResponse.json({
    id: data.id,
    status: data.status,
    display_artist_name: data.display_artist_name,
  })
}
