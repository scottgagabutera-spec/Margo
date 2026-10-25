import type { User as SupabaseUser } from '@supabase/supabase-js'

/** Best-effort full name from OAuth / email auth metadata. */
export function providerFullNameFromUser(user: SupabaseUser): string | null {
  const meta = (user.user_metadata || {}) as Record<string, unknown>
  const direct =
    (typeof meta.full_name === 'string' && meta.full_name)
    || (typeof meta.name === 'string' && meta.name)
    || (typeof meta.global_name === 'string' && meta.global_name)
    || null
  if (direct?.trim()) return direct.trim()

  const given = typeof meta.given_name === 'string' ? meta.given_name.trim() : ''
  const family = typeof meta.family_name === 'string' ? meta.family_name.trim() : ''
  const combined = [given, family].filter(Boolean).join(' ').trim()
  if (combined) return combined

  const custom = meta.custom_claims as Record<string, unknown> | undefined
  if (custom && typeof custom.full_name === 'string' && custom.full_name.trim()) {
    return custom.full_name.trim()
  }

  return null
}

export function providerAvatarFromUser(user: SupabaseUser): string | null {
  const meta = (user.user_metadata || {}) as Record<string, unknown>
  const url =
    (typeof meta.avatar_url === 'string' && meta.avatar_url)
    || (typeof meta.picture === 'string' && meta.picture)
    || null
  return url?.trim() || null
}
