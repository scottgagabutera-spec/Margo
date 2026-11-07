import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export { isAdminAppPath } from '@/lib/admin-path'

/** Server-only: true when the httpOnly session belongs to profiles.is_admin. */
export async function getServerAdminVerified(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return false

    const admin = getSupabaseAdmin()
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()
    if (profileError) return false
    return profile?.is_admin === true
  } catch {
    return false
  }
}
