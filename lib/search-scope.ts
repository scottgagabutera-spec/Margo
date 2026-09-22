import type { MargoSearchDocType } from '@/lib/meilisearch/types'

export type SearchScopeId =
  | 'all'
  | 'feed'
  | 'discover'
  | 'moments'
  | 'songs'
  | 'artists'
  | 'resonance'
  | 'library'
  | 'playlist'
  | 'hub'
  | 'people'

export type SearchScope = {
  id: SearchScopeId
  /** Shown in the search field — tells you what this place searches. */
  placeholder: string
  types: MargoSearchDocType[]
  /** Default Back when `from` is missing. */
  backHref: string
}

const ALL_TYPES: MargoSearchDocType[] = ['user', 'lyric', 'artist', 'catalog_line']

const SCOPES: Record<SearchScopeId, SearchScope> = {
  all: {
    id: 'all',
    placeholder: 'Search lyrics, people, artists…',
    types: ALL_TYPES,
    backHref: '/feed',
  },
  feed: {
    id: 'feed',
    placeholder: 'Search lyrics, people…',
    types: ['lyric', 'user'],
    backHref: '/feed',
  },
  discover: {
    id: 'discover',
    placeholder: 'Search moments, songs, artists…',
    types: ['catalog_line', 'artist', 'lyric'],
    backHref: '/discover',
  },
  moments: {
    id: 'moments',
    placeholder: 'Search lyric moments…',
    types: ['catalog_line'],
    backHref: '/discover/moments',
  },
  songs: {
    id: 'songs',
    placeholder: 'Search songs, artists…',
    types: ['catalog_line', 'artist'],
    backHref: '/discover/songs',
  },
  artists: {
    id: 'artists',
    placeholder: 'Search artists…',
    types: ['artist'],
    backHref: '/artists',
  },
  resonance: {
    id: 'resonance',
    placeholder: 'Search posts, people…',
    types: ['lyric', 'user'],
    backHref: '/discover/resonance',
  },
  library: {
    id: 'library',
    placeholder: 'Search your library…',
    types: ['catalog_line', 'artist'],
    backHref: '/library',
  },
  playlist: {
    id: 'playlist',
    placeholder: 'Search this playlist…',
    types: ['catalog_line', 'artist'],
    backHref: '/library',
  },
  hub: {
    id: 'hub',
    placeholder: 'Search people…',
    types: ['user', 'artist'],
    backHref: '/feed',
  },
  people: {
    id: 'people',
    placeholder: 'Search people…',
    types: ['user', 'artist'],
    backHref: '/feed',
  },
}

export function parseSearchScopeId(raw: string | null | undefined): SearchScopeId {
  if (raw && raw in SCOPES) return raw as SearchScopeId
  return 'all'
}

export function getSearchScope(id: SearchScopeId | string | null | undefined): SearchScope {
  return SCOPES[parseSearchScopeId(id)]
}

/** Map the current route (or Hub overlay) to a search scope. */
export function searchScopeForPath(pathname: string | null | undefined): SearchScope {
  if (!pathname) return SCOPES.all
  const p = pathname.split('?')[0]

  if (p === '/hub') return SCOPES.hub
  if (p === '/feed') return SCOPES.feed
  if (p === '/discover' || p === '/music') return SCOPES.discover
  if (p === '/discover/moments') return SCOPES.moments
  if (p === '/discover/songs') return SCOPES.songs
  if (p === '/discover/resonance') return SCOPES.resonance
  if (p === '/artists') return SCOPES.artists
  if (p.startsWith('/library/playlists/')) return SCOPES.playlist
  if (p === '/library' || p.startsWith('/library/')) return SCOPES.library
  if (p === '/messages' || p.startsWith('/messages/') || p === '/notifications') return SCOPES.people
  if (p === '/studio' || p.startsWith('/studio/')) return SCOPES.songs
  if (p.startsWith('/profile/')) {
    if (p.endsWith('/songs')) return SCOPES.songs
    return SCOPES.people
  }
  if (p === '/you' || p === '/settings') return SCOPES.people
  if (p === '/compose' || p === '/lyric-back') return SCOPES.songs
  return SCOPES.all
}

/** Same-origin path only — used as Search Back `from`. */
export function safeSearchFromPath(raw: string | null | undefined): string | null {
  if (!raw) return null
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return null
  if (raw.startsWith('/search')) return null
  return raw.split('?')[0]
}

export function searchHrefForPath(
  pathname: string | null | undefined,
  overlayPath?: string | null,
): string {
  const scope = searchScopeForPath(overlayPath || pathname)
  const from = safeSearchFromPath(pathname)
  const params = new URLSearchParams()
  if (scope.id !== 'all') params.set('scope', scope.id)
  if (from) params.set('from', from)
  const q = params.toString()
  return q ? `/search?${q}` : '/search'
}

export function sectionVisible(
  scope: SearchScope,
  section: MargoSearchDocType,
): boolean {
  return scope.types.includes(section)
}
