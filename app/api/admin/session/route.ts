import { NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin-auth'

/** UI gate: 200 if cookie session belongs to an is_admin profile. */
export async function GET() {
  const gate = await assertAdmin()
  if (!gate.ok) return gate.res
  return NextResponse.json({ ok: true, userId: gate.userId })
}
