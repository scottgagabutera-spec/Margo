import { handlesMatch } from '@/lib/artist-identity'
import { MARGO_SITE_ORIGIN } from '@/lib/moment/site-origin'

/** Official Margo artist handle — unique; display name "Margo" is not. */
const MARGO_ARTIST_USERNAME = 'trymargo'

const TITLE_BRAND = 'TryMargo'
const TITLE_MAX = 100
const DESCRIPTION_MAX = 5000

export function isMargoArtistAccount(username: string | null | undefined): boolean {
  return handlesMatch(username, MARGO_ARTIST_USERNAME)
}

function firstLyricLine(lyricText: unknown): string {
  return String(lyricText ?? '')
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean) || ''
}

function buildYouTubePromoteTitle(songTitle: unknown): string {
  const song = String(songTitle ?? '').trim()
  const title = song ? `${song} · ${TITLE_BRAND}` : TITLE_BRAND
  return title.slice(0, TITLE_MAX)
}

function buildYouTubePromoteDescription(lyricText: unknown): string {
  const lyric = firstLyricLine(lyricText)
  const parts: string[] = []
  if (lyric) {
    parts.push(lyric, '')
  }
  parts.push(
    'Play and discover.',
    'Sign up to post, share, and find music.',
    'Independent artists: get verified and upload your songs.',
    'Labels: contact hello@trymargo.com for partnerships.',
    '',
    `Via Margo (${MARGO_SITE_ORIGIN})`,
  )
  return parts.join('\n').slice(0, DESCRIPTION_MAX)
}

export function buildYouTubePromoteCopy(input: {
  songTitle: unknown
  lyricText: unknown
}): { title: string; description: string } {
  return {
    title: buildYouTubePromoteTitle(input.songTitle),
    description: buildYouTubePromoteDescription(input.lyricText),
  }
}
