import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { nowMs, perfLog, perfRequested } from '@/lib/perf-trace'

/**
 * Auth core — bootstrap memory access token from httpOnly cookies.
 * Never returns refresh_token.
 *
 * Diagnosis: ?perf=1 or x-margo-perf: 1 adds `_perf` + Server-Timing (temporary).
 */
export async function GET(request: Request) {
  const wantPerf = perfRequested(request)
  const t0 = nowMs()

  const supabase = await createClient()

  const tUser0 = nowMs()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  const getUserMs = Math.round(nowMs() - tUser0)

  if (userError || !user) {
    const res = NextResponse.json({ user: null }, { status: 401 })
    if (wantPerf) {
      const _perf = { getUserMs, getSessionMs: 0, totalMs: Math.round(nowMs() - t0), outcome: 'no_user' }
      perfLog('auth/me', _perf)
      res.headers.set('Server-Timing', `getUser;dur=${getUserMs},total;dur=${_perf.totalMs}`)
    }
    return res
  }

  const tSess0 = nowMs()
  const { data: { session } } = await supabase.auth.getSession()
  const getSessionMs = Math.round(nowMs() - tSess0)

  if (!session?.access_token) {
    const res = NextResponse.json({ user: null }, { status: 401 })
    if (wantPerf) {
      const _perf = { getUserMs, getSessionMs, totalMs: Math.round(nowMs() - t0), outcome: 'no_session' }
      perfLog('auth/me', _perf)
      res.headers.set(
        'Server-Timing',
        `getUser;dur=${getUserMs},getSession;dur=${getSessionMs},total;dur=${_perf.totalMs}`,
      )
    }
    return res
  }

  const has_password_auth = (user.identities ?? []).some(
    (identity) => identity.provider === 'email',
  )

  const totalMs = Math.round(nowMs() - t0)
  const body: Record<string, unknown> = {
    user: {
      id: user.id,
      email: user.email ?? null,
      is_anonymous: user.is_anonymous ?? false,
    },
    has_password_auth,
    access_token: session.access_token,
  }

  if (wantPerf) {
    const _perf = { getUserMs, getSessionMs, totalMs, outcome: 'ok' }
    body._perf = _perf
    perfLog('auth/me', _perf)
  }

  const res = NextResponse.json(body)
  if (wantPerf) {
    res.headers.set(
      'Server-Timing',
      `getUser;dur=${getUserMs},getSession;dur=${getSessionMs},total;dur=${totalMs}`,
    )
  }
  return res
}
