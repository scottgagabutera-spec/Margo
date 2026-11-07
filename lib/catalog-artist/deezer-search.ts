import { fetchWithTimeout } from '@/lib/fetch-with-timeout'

export type DeezerArtistHit = {
  source: 'deezer'
  sourceId: string
  name: string
  pictureUrl: string | null
}

const DEEZER_TIMEOUT_MS = 2000

export async function searchDeezerArtists(query: string, limit = 8): Promise<DeezerArtistHit[]> {
  const q = encodeURIComponent(query.trim())
  if (!q) return []
  const r = await fetchWithTimeout(`https://api.deezer.com/search/artist?q=${q}&limit=${limit}`, {
    timeoutMs: DEEZER_TIMEOUT_MS,
  })
  if (!r.ok) return []
  const data = (await r.json()) as { data?: Array<Record<string, unknown>> }
  const rows = data.data || []
  return rows
    .map((row) => {
      const id = row.id
      const name = String(row.name || '').trim()
      if (!id || !name) return null
      const picture =
        (row.picture_xl as string) ||
        (row.picture_big as string) ||
        (row.picture_medium as string) ||
        null
      return {
        source: 'deezer' as const,
        sourceId: String(id),
        name,
        pictureUrl: picture,
      }
    })
    .filter((x): x is DeezerArtistHit => !!x)
}
