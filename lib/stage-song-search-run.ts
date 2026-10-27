export type StageSearchMargoHit = {
  id: string
  title: string
  artist: string
  artwork: string
  audioUrl?: string | null
}

export type StageSearchExternalHit = {
  id: string
  title: string
  artist: string
  artwork: string
  source: 'genius' | 'apple'
  externalListenUrl?: string | null
}

export type StageSearchMergedHit = StageSearchMargoHit & {
  source: 'margo' | 'genius' | 'apple'
  margoSongId?: string
  audioUrl?: string | null
  externalListenUrl?: string | null
}

type RunStageSongSearchArgs = {
  query: string
  generation: number
  currentGeneration: () => number
  fetchMargo: () => Promise<StageSearchMargoHit[]>
  fetchExternal: (signal: AbortSignal) => Promise<StageSearchExternalHit[]>
  songMatchKey: (title: string, artist: string) => string
  onLoading: (loading: boolean) => void
  onResults: (results: StageSearchMergedHit[]) => void
}

function mergeMargoAndExternal(
  margoMapped: StageSearchMergedHit[],
  external: StageSearchExternalHit[],
  songMatchKey: (title: string, artist: string) => string,
): StageSearchMergedHit[] {
  const margoKeys = new Set(margoMapped.map((r) => songMatchKey(r.title, r.artist)))
  const externalMapped: StageSearchMergedHit[] = external
    .filter((r) => !margoKeys.has(songMatchKey(r.title, r.artist)))
    .map((r) => ({
      id: r.id,
      title: r.title,
      artist: r.artist,
      artwork: r.artwork,
      source: r.source,
      externalListenUrl: r.externalListenUrl ?? null,
    }))
  return [...margoMapped, ...externalMapped].slice(0, 8)
}

/**
 * Postgres/Margo catalog first; Genius/Apple enrich without blocking the first paint of Margo hits.
 */
export async function runStageSongSearch({
  query,
  generation,
  currentGeneration,
  fetchMargo,
  fetchExternal,
  songMatchKey,
  onLoading,
  onResults,
}: RunStageSongSearchArgs): Promise<void> {
  void query
  onLoading(true)
  const externalController = new AbortController()

  const margoMapped: StageSearchMergedHit[] = (await fetchMargo()).map((song) => ({
    id: song.id,
    title: song.title,
    artist: song.artist,
    artwork: song.artwork || '',
    source: 'margo',
    margoSongId: song.id,
    audioUrl: song.audioUrl,
  }))

  if (generation !== currentGeneration()) {
    externalController.abort()
    return
  }

  const enrichExternal = async () => {
    try {
      const external = await fetchExternal(externalController.signal)
      if (generation !== currentGeneration()) return
      onResults(mergeMargoAndExternal(margoMapped, external, songMatchKey))
      onLoading(false)
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') return
      if (generation !== currentGeneration()) return
      onResults(margoMapped.slice(0, 8))
      onLoading(false)
    }
  }

  if (margoMapped.length > 0) {
    onResults(margoMapped.slice(0, 8))
    onLoading(false)
    void enrichExternal()
    return
  }

  await enrichExternal()
}
