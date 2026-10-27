import type { MargoSearchCategoryResults, MargoSearchDocType } from './meilisearch/types.ts'
import type { SearchPostgresOptions } from './meilisearch/postgres-search.ts'

export type ScopeSearchShape = {
  id: string
  types: MargoSearchDocType[]
  lyricsRequireSong?: boolean
}

/** Maps `/api/search` scope → Postgres fallback options (same as `app/api/search/route.ts`). */
export function postgresSearchOptionsForScope(
  scope: ScopeSearchShape,
  ctx: { playlistId?: string | null; libraryUserId?: string | null },
): SearchPostgresOptions {
  return {
    types: scope.types,
    limitPerType: 8,
    playlistId: scope.id === 'playlist' ? ctx.playlistId ?? null : null,
    restrictToPlaylist: scope.id === 'playlist',
    libraryUserId: scope.id === 'library' ? ctx.libraryUserId ?? null : null,
    restrictToLibrary: scope.id === 'library',
    lyricsRequireSong: !!scope.lyricsRequireSong,
  }
}

export const PRODUCT_SEARCH_SCOPE_IDS = [
  'feed',
  'discover',
  'moments',
  'songs',
  'resonance',
  'artists',
  'hub',
  'people',
  'library',
  'playlist',
] as const

/** True when a bucket outside the scope has hits (should never happen if API honors `types`). */
export function hasCrossScopeResultLeak(
  scope: ScopeSearchShape,
  results: MargoSearchCategoryResults,
): boolean {
  if (!scope.types.includes('user') && results.users.length > 0) return true
  if (!scope.types.includes('lyric') && results.lyrics.length > 0) return true
  if (!scope.types.includes('artist') && results.artists.length > 0) return true
  if (!scope.types.includes('catalog_line') && results.catalogLines.length > 0) return true
  if (!scope.types.includes('song') && (results.songs?.length ?? 0) > 0) return true
  return false
}

export function scopedResultCounts(
  scope: ScopeSearchShape,
  results: MargoSearchCategoryResults,
): Record<string, number> {
  return {
    users: scope.types.includes('user') ? results.users.length : 0,
    lyrics: scope.types.includes('lyric') ? results.lyrics.length : 0,
    artists: scope.types.includes('artist') ? results.artists.length : 0,
    catalogLines: scope.types.includes('catalog_line') ? results.catalogLines.length : 0,
    songs: scope.types.includes('song') ? (results.songs?.length ?? 0) : 0,
  }
}
