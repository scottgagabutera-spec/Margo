import type { EchoAnswerRow } from './types.ts'

export const ECHO_SET_PAGE_ROWS = 24
export const ECHO_SET_FETCH_ROWS = 120
export const ECHO_SET_MAX_FETCH_ROWS = 480

export function filterEchoRows(rows: EchoAnswerRow[], query: string): EchoAnswerRow[] {
  const q = query.trim().toLowerCase()
  if (!q) return rows
  return rows.filter((row) => {
    if (row.displayName.toLowerCase().includes(q)) return true
    if (row.username.toLowerCase().includes(q)) return true
    return row.payload.songs.some(
      (s) => s.songTitle.toLowerCase().includes(q) || s.artistName.toLowerCase().includes(q),
    )
  })
}

export function topEchoSongs(rows: EchoAnswerRow[], limit = 3): { title: string; artist: string; count: number }[] {
  const counts = new Map<string, { title: string; artist: string; count: number }>()
  for (const row of rows) {
    const seen = new Set<string>()
    for (const song of row.payload.songs) {
      const key = `${song.songTitle}\0${song.artistName}`.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      const current = counts.get(key)
      if (current) current.count += 1
      else counts.set(key, { title: song.songTitle, artist: song.artistName, count: 1 })
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit)
}

export function formatAnswerCount(count: number): string {
  return `${count.toLocaleString('en-US')} ${count === 1 ? 'answer' : 'answers'}`
}
