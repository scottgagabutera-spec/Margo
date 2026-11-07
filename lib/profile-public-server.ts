import { getSupabaseAdmin } from '@/lib/supabase-admin'

/** Management profiles must not appear in consumer discovery (server-only). */
export async function isConsumerVisibleProfileId(profileId: string): Promise<boolean> {
  if (!profileId) return false
  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('profiles')
      .select('is_admin')
      .eq('id', profileId)
      .maybeSingle()
    if (error || !data) return false
    return data.is_admin !== true
  } catch {
    return false
  }
}

export async function isConsumerVisibleUsername(username: string): Promise<boolean> {
  const u = username.trim().toLowerCase()
  if (!u) return false
  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('profiles')
      .select('is_admin')
      .eq('username', u)
      .maybeSingle()
    if (error || !data) return false
    return data.is_admin !== true
  } catch {
    return false
  }
}

export function filterOutAdminProfileRows<T extends { id?: string | null }>(rows: T[]): Promise<T[]> {
  return stripAdminProfileRows(rows)
}

async function stripAdminProfileRows<T extends { id?: string | null }>(rows: T[]): Promise<T[]> {
  const ids = rows.map((r) => r.id).filter((id): id is string => !!id)
  if (ids.length === 0) return rows
  try {
    const admin = getSupabaseAdmin()
    const { data } = await admin.from('profiles').select('id').in('id', ids).eq('is_admin', true)
    const hidden = new Set((data || []).map((r) => r.id))
    return rows.filter((r) => !r.id || !hidden.has(r.id))
  } catch {
    return rows
  }
}
