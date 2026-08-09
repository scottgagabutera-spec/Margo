import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { nowMs } from '@/lib/perf-trace'

export type AssertAdminPerf = {
  getUserMs: number
  profileMs: number
  totalMs: number
}

export type AssertAdminResult =
  | { ok: true; userId: string; _perf?: AssertAdminPerf }
  | { ok: false; res: NextResponse; _perf?: AssertAdminPerf }

/**
 * Admin gate for /api/admin/* — httpOnly cookie session + profiles.is_admin.
 * Service-role read of is_admin (not client JWT column trust / RLS quirks).
 * 401 = no/invalid session; 403 = signed in but not admin.
 */
export async function assertAdmin(opts?: { perf?: boolean }): Promise<AssertAdminResult> {
  const wantPerf = opts?.perf === true
  const t0 = nowMs()
  let getUserMs = 0
  let profileMs = 0

  const supabase = await createClient()
  const tUser0 = nowMs()
  const { data: { user }, error } = await supabase.auth.getUser()
  getUserMs = Math.round(nowMs() - tUser0)

  if (error || !user) {
    const _perf = wantPerf
      ? { getUserMs, profileMs: 0, totalMs: Math.round(nowMs() - t0) }
      : undefined
    return {
      ok: false,
      res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      ...(wantPerf ? { _perf } : {}),
    }
  }

  let isAdmin = false
  try {
    const admin = getSupabaseAdmin()
    const tProf0 = nowMs()
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()
    profileMs = Math.round(nowMs() - tProf0)
    if (profileError) {
      console.error('[assertAdmin] profile lookup failed:', profileError.message)
      const _perf = wantPerf
        ? { getUserMs, profileMs, totalMs: Math.round(nowMs() - t0) }
        : undefined
      return {
        ok: false,
        res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
        ...(wantPerf ? { _perf } : {}),
      }
    }
    isAdmin = profile?.is_admin === true
  } catch (e: any) {
    console.error('[assertAdmin] service role unavailable:', e?.message || e)
    const _perf = wantPerf
      ? { getUserMs, profileMs, totalMs: Math.round(nowMs() - t0) }
      : undefined
    return {
      ok: false,
      res: NextResponse.json({ error: 'Server misconfigured' }, { status: 500 }),
      ...(wantPerf ? { _perf } : {}),
    }
  }

  if (!isAdmin) {
    const _perf = wantPerf
      ? { getUserMs, profileMs, totalMs: Math.round(nowMs() - t0) }
      : undefined
    return {
      ok: false,
      res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      ...(wantPerf ? { _perf } : {}),
    }
  }

  const _perf = wantPerf
    ? { getUserMs, profileMs, totalMs: Math.round(nowMs() - t0) }
    : undefined
  return { ok: true, userId: user.id, ...(wantPerf ? { _perf } : {}) }
}
