import { createClient } from '@/lib/supabase/server'
import { profileIsAdminByUserId } from '@/lib/admin-profile-check'

export { isAdminAppPath } from '@/lib/admin-path'

/** Server-only: true when the httpOnly session belongs to profiles.is_admin. */
export async function getServerAdminVerified(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return false
    return profileIsAdminByUserId(user.id)
  } catch {
    return false
  }
}

