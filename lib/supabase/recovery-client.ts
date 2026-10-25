import { createBrowserClient } from '@supabase/ssr'

/** One-off client for password-recovery links in the URL hash (not used for normal app auth). */
export function createRecoveryClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          // recovery session is in-memory only for this page
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: true,
      },
    },
  )
}
