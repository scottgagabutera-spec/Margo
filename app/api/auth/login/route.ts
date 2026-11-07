import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SIGN_IN_NEUTRAL_MESSAGE } from '@/lib/auth-login-errors'
import { enforceAuthLoginRateLimit, LOGIN_RATE_LIMIT_MESSAGE } from '@/lib/auth-login-rate-limit'

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

  const rate = await enforceAuthLoginRateLimit(req, email)
  if (!rate.ok) {
    return NextResponse.json(
      { error: LOGIN_RATE_LIMIT_MESSAGE },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } },
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.session || !data.user) {
    await new Promise((r) => setTimeout(r, 280))
    return NextResponse.json({ error: SIGN_IN_NEUTRAL_MESSAGE }, { status: 401 })
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
