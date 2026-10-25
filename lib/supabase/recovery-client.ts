import { createClient } from '@supabase/supabase-js'

/** Isolated browser client for password recovery (verifyOtp + updateUser). Not the SSR singleton. */
export function createRecoveryClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  )
}
