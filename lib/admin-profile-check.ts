import { getSupabaseAdmin } from '@/lib/supabase-admin'

/** Service-role check — used by proxy, layouts, and admin gate. */
export async function profileIsAdminByUserId(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false
  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .maybeSingle()
    if (error) return false
    return data?.is_admin === true
  } catch {
    return false
  }
}
