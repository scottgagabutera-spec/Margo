import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return '***'
  const dParts = domain.split('.')
  const domShow = dParts[0]?.length ? `${dParts[0][0]}***` : '***'
  const rest = dParts.length > 1 ? `.${dParts.slice(1).join('.')}` : ''
  const locShow = local.length <= 1 ? '*' : `${local[0]}***`
  return `${locShow}@${domShow}${rest}`
}

/**
 * Returns a masked admin account email for the forgot-password flow (no password in response).
 * Requires a signed-in user with profiles.is_admin = true.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    const adminClient = getSupabaseAdmin()
    const { data: prof } = await adminClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()
    if (prof?.is_admin !== true) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }

    const admin = getSupabaseAdmin()
    const { data: adminProf, error: pErr } = await admin
      .from('profiles')
      .select('id')
      .eq('is_admin', true)
      .limit(1)
      .maybeSingle()
    if (pErr || !adminProf?.id) {
      return NextResponse.json({ ok: false, error: 'Admin profile not found' }, { status: 404 })
    }
    const { data: userRes, error: uErr } = await admin.auth.admin.getUserById(adminProf.id)
    if (uErr || !userRes.user?.email) {
      return NextResponse.json({ ok: false, error: 'Could not resolve admin email' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, maskedEmail: maskEmail(userRes.user.email) })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
