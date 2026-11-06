import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

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
 */
export async function GET() {
  try {
    const admin = getSupabaseAdmin()
    const { data: prof, error: pErr } = await admin
      .from('profiles')
      .select('id')
      .eq('is_admin', true)
      .limit(1)
      .maybeSingle()
    if (pErr || !prof?.id) {
      return NextResponse.json({ ok: false, error: 'Admin profile not found' }, { status: 404 })
    }
    const { data: userRes, error: uErr } = await admin.auth.admin.getUserById(prof.id)
    if (uErr || !userRes.user?.email) {
      return NextResponse.json({ ok: false, error: 'Could not resolve admin email' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, maskedEmail: maskEmail(userRes.user.email) })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
