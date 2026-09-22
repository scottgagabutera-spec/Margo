import { MARGO_SITE_ORIGIN } from '@/lib/moment/site-origin'

const TEXT_MAX = 2200

function firstLyricLine(lyricText: unknown): string {
  return String(lyricText ?? '')
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean) || ''
}

/** Caption text for Buffer cross-posts — kept short; video carries the lyric moment. */
export function buildBufferPromoteText(input: {
  songTitle: unknown
  lyricText: unknown
  artistName?: unknown
}): string {
  const song = String(input.songTitle ?? '').trim()
  const artist = String(input.artistName ?? '').trim()
  const lyric = firstLyricLine(input.lyricText)

  const parts: string[] = []
  if (lyric) parts.push(`"${lyric}"`)
  if (song && artist) parts.push(`${song} — ${artist}`)
  else if (song) parts.push(song)
  parts.push(`Via Margo · ${MARGO_SITE_ORIGIN}`)

  return parts.join('\n\n').slice(0, TEXT_MAX)
}
