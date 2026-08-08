import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Auth core — mint a new access_token using the httpOnly refresh cookie.
 * Never returns refresh_token.
 */
export async function POST() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.refreshSession()
  if (error || !data.session?.access_token || !data.user) {
    return NextResponse.json(
      { error: error?.message || 'refresh failed' },
      { status: 401 },
    )
  }

  return NextResponse.json({
    user: {
      id: data.user.id,
      email: data.user.email ?? null,
      is_anonymous: data.user.is_anonymous ?? false,
    },
    access_token: data.session.access_token,
  })
}
