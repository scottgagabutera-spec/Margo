import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { getPromoteAdmin } from '@/lib/promote/admin-client'
import { requirePromoteSession } from '@/lib/promote/api-auth'
import { isStalePromoteAttemptError } from '@/lib/promote/connection-settings-copy'
import { mapConnectionPublic } from '@/lib/promote/connections'
import type { PromotePlatform } from '@/lib/promote/types'

const DISCONNECT_PLATFORMS = new Set<PromotePlatform>([
  'youtube',
  'tiktok',
  'instagram',
  'facebook',
  'x',
])

export async function GET() {
  const session = await requirePromoteSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = await createServerSupabase()
  const { data, error } = await supabase
    .from('artist_social_connections')
    .select('id, platform, status, external_account_id, external_username, connected_at, last_publish_at, last_error')
    .eq('profile_id', session.userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    connections: (data || []).map((row) => {
      const pub = mapConnectionPublic({
        ...row,
        profile_id: session.userId,
        access_token_enc: '',
        refresh_token_enc: null,
        token_expires_at: null,
        scopes: [],
      })
      if (
        pub.status === 'connected'
        && pub.lastError
        && isStalePromoteAttemptError(pub.lastError)
      ) {
        return { ...pub, lastError: null }
      }
      return pub
    }),
  })
}

export async function DELETE(request: Request) {
  const session = await requirePromoteSession()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { platform?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!body.platform) {
    return NextResponse.json({ error: 'platform is required' }, { status: 400 })
  }

  if (!DISCONNECT_PLATFORMS.has(body.platform as PromotePlatform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
  }

  const admin = getPromoteAdmin()
  if (!admin) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  const { error } = await admin
    .from('artist_social_connections')
    .delete()
    .eq('profile_id', session.userId)
    .eq('platform', body.platform)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
