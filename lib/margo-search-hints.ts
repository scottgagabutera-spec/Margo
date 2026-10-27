/** Typewriter timing — one animation system app-wide. */
export const MARGO_SEARCH_HINT_CHAR_MS = 42
export const MARGO_SEARCH_HINT_PAUSE_MS = 1400

/** Catalog song/lyric pickers + Discover unified search scope. */
export const MARGO_SEARCH_HINT_CATALOG = 'Search song, artist, lyrics'

export const MARGO_SEARCH_HINT_SONGS = 'Search songs, artists'
export const MARGO_SEARCH_HINT_MOMENTS = 'Search moments, lyrics'
export const MARGO_SEARCH_HINT_ARTISTS = 'Search artists'
export const MARGO_SEARCH_HINT_RESONANCE = 'Search posts, people'
export const MARGO_SEARCH_HINT_FEED = 'Search lyrics, people'
export const MARGO_SEARCH_HINT_PEOPLE = 'Search people'
export const MARGO_SEARCH_HINT_LIBRARY = 'Search your library'
export const MARGO_SEARCH_HINT_PLAYLIST = 'Search this playlist'

/** @deprecated Use MARGO_SEARCH_HINT_CATALOG */
export const MARGO_CATALOG_SEARCH_HINT_FULL = MARGO_SEARCH_HINT_CATALOG

export const MARGO_CATALOG_SEARCH_ARIA_LABEL = MARGO_SEARCH_HINT_CATALOG

export function margoSearchStaticPlaceholder(hintText: string): string {
  return `${hintText}…`
}

/** Animated + static placeholder text for Meilisearch `/search` scopes. */
export function margoSearchHintForScopeId(scopeId: string): string {
  switch (scopeId) {
    case 'discover':
      return MARGO_SEARCH_HINT_CATALOG
    case 'songs':
      return MARGO_SEARCH_HINT_SONGS
    case 'moments':
      return MARGO_SEARCH_HINT_MOMENTS
    case 'artists':
      return MARGO_SEARCH_HINT_ARTISTS
    case 'resonance':
      return MARGO_SEARCH_HINT_RESONANCE
    case 'feed':
      return MARGO_SEARCH_HINT_FEED
    case 'hub':
    case 'people':
      return MARGO_SEARCH_HINT_PEOPLE
    case 'library':
      return MARGO_SEARCH_HINT_LIBRARY
    case 'playlist':
      return MARGO_SEARCH_HINT_PLAYLIST
    case 'all':
    default:
      return MARGO_SEARCH_HINT_CATALOG
  }
}

/** Legacy export — tests may reference. */
export const MARGO_CATALOG_SEARCH_STATIC_PLACEHOLDER = margoSearchStaticPlaceholder(
  MARGO_SEARCH_HINT_CATALOG,
)

export const MARGO_CATALOG_HINT_CHAR_MS = MARGO_SEARCH_HINT_CHAR_MS
export const MARGO_CATALOG_HINT_PAUSE_MS = MARGO_SEARCH_HINT_PAUSE_MS
