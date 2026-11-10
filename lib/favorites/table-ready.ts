import { getSupabaseAdmin } from '@/lib/supabase-admin'

const ready = {
  songs: null as boolean | null,
  albums: null as boolean | null,
}

function isMissingRelation(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false
  if (err.code === '42P01') return true
  const msg = err.message?.toLowerCase() ?? ''
  return msg.includes('does not exist') && msg.includes('profile_favorite')
}

export async function favoriteSongsTablesReady(): Promise<boolean> {
  if (ready.songs !== null) return ready.songs
  const admin = getSupabaseAdmin()
  const { error } = await admin.from('profile_favorite_songs').select('profile_id').limit(1)
  ready.songs = !isMissingRelation(error)
  return ready.songs
}

export async function favoriteAlbumsTablesReady(): Promise<boolean> {
  if (ready.albums !== null) return ready.albums
  const admin = getSupabaseAdmin()
  const { error } = await admin.from('profile_favorite_albums').select('profile_id').limit(1)
  ready.albums = !isMissingRelation(error)
  return ready.albums
}
