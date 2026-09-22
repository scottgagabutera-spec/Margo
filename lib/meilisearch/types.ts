export type MargoSearchDocType = 'user' | 'lyric' | 'artist' | 'catalog_line' | 'song'

export type RelatedSongHit = {
  id: string
  title: string
  artworkUrl?: string | null
}

export interface MargoSearchDocument {
  /** Composite id: `post:uuid`, `user:uuid`, `song:uuid`, `line:songId:index` */
  id: string
  type: MargoSearchDocType
  title?: string
  subtitle?: string
  text?: string
  emotion?: string
  username?: string
  songId?: string
  postId?: string
  profileId?: string
  artworkUrl?: string | null
  resonateCount?: number
  plays?: number
  createdAt?: number
  /** Artist results: a few of their live songs. */
  relatedSongs?: RelatedSongHit[]
}

export interface MargoSearchHit extends MargoSearchDocument {
  _formatted?: Partial<MargoSearchDocument>
}

export interface MargoSearchCategoryResults {
  users: MargoSearchHit[]
  lyrics: MargoSearchHit[]
  artists: MargoSearchHit[]
  catalogLines: MargoSearchHit[]
  songs: MargoSearchHit[]
}

export interface MargoSearchResponse {
  query: string
  results: MargoSearchCategoryResults
  processingTimeMs: number
}
