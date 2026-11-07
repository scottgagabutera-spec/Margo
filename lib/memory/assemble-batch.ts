import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { publicCatalogMediaUrl } from '@/lib/r2/catalog-media-url'
import {
  isMemoryPosterR2Key,
  isMemoryVideoR2Key,
  memoryVideoPosterKey,
} from '@/lib/r2/memory-media-keys'
import type { MemoryPublic } from '@/lib/memory/types'

type Row = Record<string, unknown>

function mapOneMemory(
  memory: Row,
  owner: { username: string; display_name: string | null; avatar_url: string | null },
  songs: Row[],
  photos: Row[],
  songMeta: Map<string, { artwork_url: string | null; audio_url: string | null }>,
  viewerResonated: boolean,
  viewerId: string | null,
): MemoryPublic {
  const memoryId = memory.id as string
  const ownerId = memory.owner_profile_id as string

  const coverKey = memory.cover_r2_key as string | null
  let coverUrl = coverKey ? publicCatalogMediaUrl(coverKey) : null
  if (!coverUrl && songs.length) {
    const firstWithArt = songs.find((s) => s.song_id && songMeta.get(s.song_id as string)?.artwork_url)
    if (firstWithArt?.song_id) {
      coverUrl = songMeta.get(firstWithArt.song_id as string)?.artwork_url || null
    }
  }
  if (!coverUrl && photos.length) {
    const first = photos.find((p) => !isMemoryPosterR2Key(p.r2_key as string))
    if (first) coverUrl = publicCatalogMediaUrl(first.r2_key as string)
  }

  return {
    id: memoryId,
    ownerProfileId: ownerId,
    ownerUsername: owner.username,
    ownerDisplayName: (owner.display_name as string) || owner.username,
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
    songCount: songs.length,
    resonateCount: (memory.resonate_count as number) ?? 0,
    lyricBackCount: (memory.lyric_back_count as number) ?? 0,
    createdAt: memory.created_at as string,
    songs: songs.map((s) => {
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
    photos: photos
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
    viewerResonated,
    isOwner: viewerId === ownerId,
  }
}

/** Assemble many memories with a constant number of DB round-trips (not per row). */
export async function assembleMemoriesPublicBatch(
  memoryRows: Row[],
  viewerId: string | null,
): Promise<MemoryPublic[]> {
  if (memoryRows.length === 0) return []
  const admin = getSupabaseAdmin()
  const memoryIds = memoryRows.map((r) => r.id as string)
  const ownerIds = [...new Set(memoryRows.map((r) => r.owner_profile_id as string))]

  const [
    { data: owners },
    { data: allSongs },
    { data: allPhotos },
    resonateHits,
  ] = await Promise.all([
    admin
      .from('profiles')
      .select('id, username, display_name, avatar_url, is_admin')
      .in('id', ownerIds),
    admin.from('memory_songs').select('*').in('memory_id', memoryIds).order('position'),
    admin.from('memory_photos').select('*').in('memory_id', memoryIds).order('position'),
    viewerId
      ? admin.from('memory_resonates').select('memory_id').in('memory_id', memoryIds).eq('actor_id', viewerId)
      : Promise.resolve({ data: [] as { memory_id: string }[] }),
  ])

  const ownerMap = new Map<string, { username: string; display_name: string | null; avatar_url: string | null }>()
  for (const o of owners || []) {
    if (o.is_admin) continue
    ownerMap.set(o.id as string, {
      username: o.username as string,
      display_name: (o.display_name as string | null) ?? null,
      avatar_url: (o.avatar_url as string | null) ?? null,
    })
  }

  const songsByMemory = new Map<string, Row[]>()
  for (const s of allSongs || []) {
    const mid = s.memory_id as string
    const list = songsByMemory.get(mid) || []
    list.push(s)
    songsByMemory.set(mid, list)
  }

  const photosByMemory = new Map<string, Row[]>()
  for (const p of allPhotos || []) {
    const mid = p.memory_id as string
    const list = photosByMemory.get(mid) || []
    list.push(p)
    photosByMemory.set(mid, list)
  }

  const resonatedSet = new Set((resonateHits.data || []).map((r) => r.memory_id as string))

  const songIds = [...new Set((allSongs || []).map((s) => s.song_id).filter(Boolean))] as string[]
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

  const out: MemoryPublic[] = []
  for (const row of memoryRows) {
    const owner = ownerMap.get(row.owner_profile_id as string)
    if (!owner) continue
    const mid = row.id as string
    out.push(
      mapOneMemory(
        row,
        owner,
        songsByMemory.get(mid) || [],
        photosByMemory.get(mid) || [],
        songMeta,
        resonatedSet.has(mid),
        viewerId,
      ),
    )
  }
  return out
}
