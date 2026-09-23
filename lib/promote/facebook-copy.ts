import { MARGO_SITE_ORIGIN } from '@/lib/moment/site-origin'

const DESCRIPTION_MAX = 5000
const TITLE_MAX = 100

function firstLyricLine(lyricText: unknown): string {
  return String(lyricText ?? '')
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean) || ''
}

export function buildFacebookPromoteCopy(input: {
  songTitle: unknown
  lyricText: unknown
  artistName?: unknown
}): { title: string; description: string } {
  const song = String(input.songTitle ?? '').trim()
  const artist = String(input.artistName ?? '').trim()
  const lyric = firstLyricLine(input.lyricText)

  const title = (song && artist ? `${song} — ${artist}` : song || 'Lyric Moment').slice(0, TITLE_MAX)

  const parts: string[] = []
  if (lyric) parts.push(`"${lyric}"`)
  if (song && artist) parts.push(`${song} by ${artist}`)
  parts.push(`Via Margo · ${MARGO_SITE_ORIGIN}`)

  return {
    title,
    description: parts.join('\n\n').slice(0, DESCRIPTION_MAX),
  }
}
