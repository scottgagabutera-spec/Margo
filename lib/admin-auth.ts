import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export type AssertAdminResult =
  | { ok: true; userId: string }
  | { ok: false; res: NextResponse }

/**
 * Admin gate for /api/admin/* — httpOnly cookie session + profiles.is_admin.
 * Service-role read of is_admin (not client JWT column trust / RLS quirks).
 * 401 = no/invalid session; 403 = signed in but not admin.
 */
export async function assertAdmin(): Promise<AssertAdminResult> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return {
      ok: false,
      res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  let isAdmin = false
  try {
    const admin = getSupabaseAdmin()
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()
    if (profileError) {
      console.error('[assertAdmin] profile lookup failed:', profileError.message)
      return {
        ok: false,
        res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      }
    }
    isAdmin = profile?.is_admin === true
  } catch (e: any) {
    console.error('[assertAdmin] service role unavailable:', e?.message || e)
    return {
      ok: false,
      res: NextResponse.json({ error: 'Server misconfigured' }, { status: 500 }),
    }
  }

  if (!isAdmin) {
    return {
      ok: false,
      res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return { ok: true, userId: user.id }
}
