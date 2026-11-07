import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { publicCatalogMediaUrl } from '@/lib/r2/catalog-media-url'
import {
  isMemoryPosterR2Key,
  isMemoryVideoR2Key,
  memoryVideoPosterKey,
} from '@/lib/r2/memory-media-keys'
import type { MemoryPublic } from '@/lib/memory/types'

type Row = Record<string, unknown>

export async function assembleMemoryPublic(
  memory: Row,
  viewerId: string | null,
): Promise<MemoryPublic | null> {
  const admin = getSupabaseAdmin()
  const memoryId = memory.id as string
  const ownerId = memory.owner_profile_id as string

  const { data: owner } = await admin
    .from('profiles')
    .select('username, display_name, avatar_url, is_admin')
    .eq('id', ownerId)
    .maybeSingle()
  if (!owner || owner.is_admin) return null

  const [{ data: songs }, { data: photos }, resonateHit] = await Promise.all([
    admin.from('memory_songs').select('*').eq('memory_id', memoryId).order('position'),
    admin.from('memory_photos').select('*').eq('memory_id', memoryId).order('position'),
    viewerId
      ? admin.from('memory_resonates').select('memory_id').eq('memory_id', memoryId).eq('actor_id', viewerId).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const songIds = (songs || []).map((s) => s.song_id).filter(Boolean) as string[]
  const songMeta = new Map<string, { artwork_url: string | null; audio_url: string | null }>()
  if (songIds.length) {
    const { data: catalog } = await admin.from('songs').select('id, artwork_url, audio_url').in('id', songIds)
    for (const s of catalog || []) {
      songMeta.set(s.id as string, {
        artwork_url: s.artwork_url as string | null,
        audio_url: s.audio_url as string | null,
      })
    }
  }

  const coverKey = memory.cover_r2_key as string | null
  let coverUrl = coverKey ? publicCatalogMediaUrl(coverKey) : null
  if (!coverUrl && songs?.length) {
    const firstWithArt = (songs || []).find((s) => s.song_id && songMeta.get(s.song_id as string)?.artwork_url)
    if (firstWithArt?.song_id) {
      const art = songMeta.get(firstWithArt.song_id as string)?.artwork_url
      coverUrl = art || null
    }
  }
  if (!coverUrl && photos?.length) {
    coverUrl = publicCatalogMediaUrl((photos[0] as Row).r2_key as string)
  }

  return {
    id: memoryId,
    ownerProfileId: ownerId,
    ownerUsername: owner.username as string,
    ownerDisplayName: (owner.display_name as string) || (owner.username as string),
    ownerAvatarUrl: (owner.avatar_url as string | null) ?? null,
    title: memory.title as string,
    story: (memory.story as string | null) ?? null,
    mood: (memory.mood as string | null) ?? null,
    visibility: memory.visibility as MemoryPublic['visibility'],
    showInLyricsFeed: !!memory.show_in_lyrics_feed,
    showDatePublicly: !!memory.show_date_publicly,
    dateGranularity: memory.date_granularity as MemoryPublic['dateGranularity'],
    dateStart: (memory.date_start as string | null) ?? null,
    dateEnd: (memory.date_end as string | null) ?? null,
    coverUrl,
    songCount: songs?.length ?? 0,
    resonateCount: (memory.resonate_count as number) ?? 0,
    lyricBackCount: (memory.lyric_back_count as number) ?? 0,
    createdAt: memory.created_at as string,
    songs: (songs || []).map((s) => {
      const sid = s.song_id as string | null
      const meta = sid ? songMeta.get(sid) : undefined
      return {
        id: s.id as string,
        position: s.position as number,
        songId: sid,
        songTitle: s.song_title as string,
        artistName: s.artist_name as string,
        lyricExcerpt: (s.lyric_excerpt as string | null) ?? null,
        isLyricOnly: !!s.is_lyric_only,
        artworkUrl: meta?.artwork_url ?? null,
        audioUrl: meta?.audio_url ?? null,
      }
    }),
    photos: (photos || [])
      .filter((p) => !isMemoryPosterR2Key(p.r2_key as string))
      .map((p) => {
        const r2Key = p.r2_key as string
        const video = isMemoryVideoR2Key(r2Key)
        const posterKey =
          (p.poster_r2_key as string | null | undefined)?.trim()
          || (video ? memoryVideoPosterKey(r2Key) : null)
        return {
          id: p.id as string,
          position: p.position as number,
          url: publicCatalogMediaUrl(r2Key),
          width: (p.width as number | null) ?? null,
          height: (p.height as number | null) ?? null,
          mediaType: (video ? 'video' : 'image') as 'image' | 'video',
          posterUrl: posterKey ? publicCatalogMediaUrl(posterKey) : null,
          durationSec: (p.duration_sec as number | null) ?? null,
        }
      }),
    viewerResonated: !!resonateHit?.data,
    isOwner: viewerId === ownerId,
  }
}
