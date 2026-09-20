import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { requireActivePromoteArtist } from '@/lib/promote/artist-gate'

export async function requirePromoteSession(): Promise<{ userId: string } | null> {
  const supabase = await createServerSupabase()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user?.id) return null
  const artist = await requireActivePromoteArtist(supabase, data.user.id)
  if (!artist) return null
  return { userId: data.user.id }
}
