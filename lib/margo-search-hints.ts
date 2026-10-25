/** Cycling catalog search hints (song / lyric / artist). */
export const MARGO_CATALOG_SEARCH_HINT_WORDS = ['song', 'lyric', 'artist'] as const

export const MARGO_CATALOG_SEARCH_ARIA_LABEL = 'Search by song, lyric, or artist'

export const MARGO_CATALOG_SEARCH_STATIC_PLACEHOLDER = 'Search with song, lyric, artist…'

export function nextCatalogSearchHintIndex(current: number): number {
  return (current + 1) % MARGO_CATALOG_SEARCH_HINT_WORDS.length
}
