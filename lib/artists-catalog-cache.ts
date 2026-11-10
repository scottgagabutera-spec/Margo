import type { ArtistRow } from '@/lib/discover-view-more-logic'

type ArtistsCatalogCache = {
  artists: ArtistRow[]
  songCountByProfileId: Map<string, number>
  loadedAt: number
}

let cache: ArtistsCatalogCache | null = null

export function peekArtistsCatalogCache(): ArtistsCatalogCache | null {
  return cache
}

export function writeArtistsCatalogCache(next: Omit<ArtistsCatalogCache, 'loadedAt'>) {
  cache = { ...next, loadedAt: Date.now() }
}

export function clearArtistsCatalogCache() {
  cache = null
}
