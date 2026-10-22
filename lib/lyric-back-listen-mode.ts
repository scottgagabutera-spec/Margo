import { resolveExternalListenUrl } from '@/lib/moment/listen'

export type LyricBackListenInput = {
  songId?: string | null
  audioUrl?: string | null
  songTitle?: string | null
  artistName?: string | null
  externalListenUrl?: string | null
}

export type LyricBackListenMode = 'play' | 'external' | 'none'

export function resolveLyricBackListenMode(input: LyricBackListenInput): LyricBackListenMode {
  if (input.audioUrl && input.songId) return 'play'
  const external = resolveExternalListenUrl({
    songTitle: input.songTitle,
    artistName: input.artistName,
    itunesTrackUrl: input.externalListenUrl,
  })
  return external ? 'external' : 'none'
}
