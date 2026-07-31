import { createClient } from '@supabase/supabase-js'

// Server-only client using the service role key — bypasses RLS. NEVER
// import this from a 'use client' file, and never expose
// SUPABASE_SERVICE_ROLE_KEY to the browser (no NEXT_PUBLIC_ prefix).
// Used only inside app/api/* route handlers that write on behalf of a
// user after independently verifying something server-side. The whole
// point of routing writes through here is that the browser's own
// session can never trigger an approval directly — only a route that
// has actually checked the Suno code itself can.
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('Supabase admin client missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}