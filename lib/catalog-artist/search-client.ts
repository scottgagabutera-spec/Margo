'use client'

export type ArtistSearchResult = {
  id: string
  name: string
  previewArtworkUrl: string | null
  artworkUrl: string | null
  onMargo: boolean
  margoUsername: string | null
}

const sessionCache = new Map<string, ArtistSearchResult[]>()
let generation = 0
let inFlight: AbortController | null = null

export function peekArtistSearchCache(query: string): ArtistSearchResult[] | undefined {
  const key = query.trim().toLowerCase()
  if (key.length < 2) return undefined
  return sessionCache.get(key)
}

export async function runArtistSearch({
  query,
  onLoading,
  onResults,
  onTimingMs,
}: {
  query: string
  onLoading: (loading: boolean) => void
  onResults: (results: ArtistSearchResult[]) => void
  onTimingMs?: (ms: number) => void
}): Promise<void> {
  const trimmed = query.trim()
  const cacheKey = trimmed.toLowerCase()

  if (cacheKey.length < 2) {
    generation += 1
    inFlight?.abort()
    inFlight = null
    onLoading(false)
    onResults([])
    return
  }

  const cached = sessionCache.get(cacheKey)
  if (cached) {
    onResults(cached)
    onLoading(false)
    return
  }

  generation += 1
  const myGen = generation
  inFlight?.abort()
  const ac = new AbortController()
  inFlight = ac
  onLoading(true)

  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now()
  try {
    const res = await fetch(`/api/artists/search?q=${encodeURIComponent(trimmed)}`, {
      signal: ac.signal,
    })
    if (myGen !== generation) return
    const data = (await res.json()) as { artists?: ArtistSearchResult[] }
    const artists = data.artists ?? []
    sessionCache.set(cacheKey, artists)
    onResults(artists)
    const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now()
    onTimingMs?.(Math.round(t1 - t0))
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return
    if (myGen === generation) onResults([])
  } finally {
    if (myGen === generation) onLoading(false)
  }
}
