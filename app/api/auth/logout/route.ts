import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** Auth core — clear httpOnly session cookies. */
export async function POST() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
