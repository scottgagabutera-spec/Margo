import type { MargoMoment, MargoMomentLine } from '@/lib/moment/types'

export type MomentListenMode = 'margo-inline' | 'external'

/** External listen destinations resolved from real metadata — never invented. */
export interface MomentListenContext {
  appleMusicUrl?: string | null
  spotifyUrl?: string | null
  youtubeUrlFromSong?: string | null
  /** Post-level YouTube link */
  youtubeUrl?: string | null
  /** iTunes track URL from search provenance (Stage / compose search) */
  itunesTrackUrl?: string | null
}

export interface MomentListenResolution {
  mode: MomentListenMode
  canPlayInline: boolean
  externalUrl: string | null
  songId?: string | null
  audioUrl?: string | null
  snippetStart?: number | null
  snippetEnd?: number | null
  lineLyric?: string | null
}

function trimUrl(url: string | null | undefined): string | null {
  const s = (url || '').trim()
  if (!s || (!s.startsWith('http://') && !s.startsWith('https://'))) return null
  return s
}

export function appleMusicSearchUrl(song: string, artist: string): string {
  const term = [song, artist].filter(Boolean).join(' ')
  return 'https://music.apple.com/search?term=' + encodeURIComponent(term)
}

function lineListenContext(line: MargoMomentLine): MomentListenContext {
  return {
    appleMusicUrl: line.appleMusicUrl,
    spotifyUrl: line.spotifyUrl,
    youtubeUrlFromSong: line.youtubeUrl,
  }
}

function primaryLineForListen(moment: MargoMoment): MargoMomentLine | null {
  const playable = moment.lines.find(
    (l) =>
      l.songId &&
      l.audioUrl &&
      l.snippetStart != null &&
      l.snippetEnd != null,
  )
  if (playable) return playable
  return moment.lines.find((l) => l.lyric.trim().length > 0) ?? null
}

function resolveExternalUrl(
  line: MargoMomentLine,
  context: MomentListenContext,
): string {
  const merged: MomentListenContext = {
    ...context,
    ...lineListenContext(line),
  }

  return (
    trimUrl(merged.appleMusicUrl) ||
    trimUrl(merged.spotifyUrl) ||
    trimUrl(merged.youtubeUrlFromSong) ||
    trimUrl(merged.youtubeUrl) ||
    trimUrl(merged.itunesTrackUrl) ||
    appleMusicSearchUrl(line.songTitle, line.artistName)
  )
}

/**
 * Resolve Listen ↗ / inline playback for a canonical Moment.
 * Priority: Margo playable → apple_music_url → spotify → youtube (song) →
 * youtube (post) → iTunes trackViewUrl → Apple Music search.
 */
export function resolveMomentListen(
  moment: MargoMoment,
  context: MomentListenContext = {},
): MomentListenResolution {
  const line = primaryLineForListen(moment)
  if (!line) {
    return {
      mode: 'external',
      canPlayInline: false,
      externalUrl: null,
    }
  }

  const canPlayInline = !!(
    line.songId &&
    line.audioUrl &&
    line.snippetStart != null &&
    line.snippetEnd != null
  )

  if (canPlayInline) {
    return {
      mode: 'margo-inline',
      canPlayInline: true,
      externalUrl: null,
      songId: line.songId,
      audioUrl: line.audioUrl,
      snippetStart: line.snippetStart,
      snippetEnd: line.snippetEnd,
      lineLyric: line.lyric,
    }
  }

  return {
    mode: 'external',
    canPlayInline: false,
    externalUrl: resolveExternalUrl(line, context),
    songId: line.songId ?? null,
    audioUrl: line.audioUrl ?? null,
    snippetStart: line.snippetStart ?? null,
    snippetEnd: line.snippetEnd ?? null,
    lineLyric: line.lyric,
  }
}
