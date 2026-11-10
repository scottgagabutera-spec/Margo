import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isConsumerVisibleUsername } from '@/lib/profile-public-server'
import { loadProfileFavoriteArtists } from '@/lib/profile/load-favorite-artists'
import { loadProfileFavoriteSongs } from '@/lib/profile/load-favorite-songs'
import { favoriteAlbumsTablesReady, favoriteSongsTablesReady } from '@/lib/favorites/table-ready'
import type { ProfileFavoriteSong } from '@/lib/profile/load-favorite-songs'
import { assembleMemoriesPublicBatch } from '@/lib/memory/assemble-batch'
import { MEMORY_ROW_SELECT } from '@/lib/memory/columns'
import type { MemoryPublic } from '@/lib/memory/types'
import type { ProfileFavoriteArtist } from '@/components/profile-favorite-artists-row'

export type ProfileSurfacePayload = {
  profileId: string
  username: string
  favoriteArtists: ProfileFavoriteArtist[]
  favoriteSongs: ProfileFavoriteSong[]
  favoriteSongsReady: boolean
  favoriteAlbumsReady: boolean
  memories: MemoryPublic[]
  memoriesIsOwner: boolean
  viewerFollowStatus: 'pending' | 'accepted' | null | undefined
}

export async function buildProfileSurface(usernameRaw: string): Promise<ProfileSurfacePayload | null> {
  const username = usernameRaw.trim().toLowerCase()
  if (!username) return null
  if (!(await isConsumerVisibleUsername(username))) return null

  const admin = getSupabaseAdmin()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const viewerId = user?.id ?? null

  const { data: prof } = await admin
    .from('profiles')
    .select('id, username, is_admin')
    .eq('username', username)
    .maybeSingle()

  if (!prof || prof.is_admin) return null
  const profileId = prof.id as string

  let viewerFollowStatus: 'pending' | 'accepted' | null | undefined
  if (viewerId && viewerId !== profileId) {
    const { data: follow } = await supabase
      .from('follows')
      .select('status')
      .eq('follower_id', viewerId)
      .eq('followee_id', profileId)
      .maybeSingle()
    viewerFollowStatus = follow ? (follow.status as 'pending' | 'accepted') : null
  }

  const songsReady = await favoriteSongsTablesReady()
  const albumsReady = await favoriteAlbumsTablesReady()

  const [favoriteArtists, favoriteSongs, memoryRows] = await Promise.all([
    loadProfileFavoriteArtists(profileId),
    songsReady ? loadProfileFavoriteSongs(profileId) : Promise.resolve([]),
    supabase
      .from('memories')
      .select(MEMORY_ROW_SELECT)
      .eq('owner_profile_id', profileId)
      .is('content_removed_at', null)
      .order('created_at', { ascending: false })
      .limit(60)
      .then((r) => r.data || []),
  ])

  const assembled = await assembleMemoriesPublicBatch(memoryRows, viewerId)
  const isOwner = viewerId === profileId
  const memories = isOwner ? assembled : assembled.filter((m) => m.visibility !== 'only_me')

  return {
    profileId,
    username: prof.username as string,
    favoriteArtists,
    favoriteSongs,
    favoriteSongsReady: songsReady,
    favoriteAlbumsReady: albumsReady,
    memories,
    memoriesIsOwner: isOwner,
    viewerFollowStatus,
  }
}
