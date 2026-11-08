import { compactArtworkUrl } from '@/lib/compact-artwork-url'
import { fetchExternalSongHits } from '@/lib/genius-external-search'
import { searchMargoSongs } from '@/lib/search-margo-songs'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { EchoSongPayload, EchoSongPayloadItem } from './types.ts'

function normTitle(title: string): string {
  return title.trim().toLowerCase()
}

async function resolveSongMeta(title: string, knownArtist?: string): Promise<Partial<EchoSongPayloadItem>> {
  const admin = getSupabaseAdmin()
  const q = knownArtist ? `${title} ${knownArtist}` : title
  const [margoHits, external] = await Promise.all([
    searchMargoSongs(admin, q, 6),
    fetchExternalSongHits(q, process.env.GENIUS_API_KEY).catch(() => []),
  ])
  const want = normTitle(title)
  const margo = margoHits.find((h) => normTitle(h.title) === want) ?? margoHits[0]
  if (margo) {
    return {
      artistName: margo.artist || knownArtist || '',
      artworkUrl: margo.artwork ? compactArtworkUrl(margo.artwork) : null,
      songId: margo.id ?? null,
      audioUrl: margo.audioUrl ?? null,
      isLyricOnly: !margo.id,
    }
  }
  const ext = external.find((h) => normTitle(h.song) === want) ?? external[0]
  if (ext) {
    return {
      artistName: ext.artist || knownArtist || '',
      artworkUrl: ext.artwork ? compactArtworkUrl(ext.artwork) : null,
      isLyricOnly: true,
      externalListenUrl: ext.trackViewUrl ?? null,
    }
  }
  return knownArtist ? { artistName: knownArtist } : {}
}

export async function enrichEchoSongPayload(payload: EchoSongPayload): Promise<EchoSongPayload> {
  const songs = await Promise.all(
    payload.songs.map(async (song) => {
      const needsArtist = !song.artistName?.trim()
      const needsArt = !song.artworkUrl?.trim()
      if (!needsArtist && !needsArt) return song
      const patch = await resolveSongMeta(song.songTitle, song.artistName)
      return {
        ...song,
        artistName: song.artistName?.trim() ? song.artistName : patch.artistName || song.artistName,
        artworkUrl: song.artworkUrl || patch.artworkUrl || null,
        songId: song.songId ?? patch.songId ?? null,
        audioUrl: song.audioUrl ?? patch.audioUrl ?? null,
        isLyricOnly: song.isLyricOnly ?? patch.isLyricOnly ?? true,
        externalListenUrl: song.externalListenUrl ?? patch.externalListenUrl ?? null,
      }
    }),
  )
  return { songs }
}

export async function persistEnrichedEchoAnswer(answerId: string, payload: EchoSongPayload) {
  const admin = getSupabaseAdmin()
  await admin.from('echo_answers').update({ payload }).eq('id', answerId)
}
