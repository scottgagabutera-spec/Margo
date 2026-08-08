import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Auth core — password sign-in on the server so Set-Cookie is httpOnly.
 * Returns user + access_token only (refresh stays in the cookie jar).
 */
export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const email = body.email?.trim()
  const password = body.password
  if (!email || !password) {
    return NextResponse.json({ error: 'email and password required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.session || !data.user) {
    return NextResponse.json(
      { error: error?.message || 'Invalid login credentials' },
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
