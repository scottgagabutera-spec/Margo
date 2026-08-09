import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Auth core — bootstrap memory access token from httpOnly cookies.
 * Never returns refresh_token.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  const has_password_auth = (user.identities ?? []).some(
    (identity) => identity.provider === 'email',
  )

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email ?? null,
      is_anonymous: user.is_anonymous ?? false,
    },
    has_password_auth,
    access_token: session.access_token,
  })
}
