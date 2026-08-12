export type MargoSearchDocType = 'user' | 'lyric' | 'artist' | 'catalog_line'

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
}

export interface MargoSearchHit extends MargoSearchDocument {
  _formatted?: Partial<MargoSearchDocument>
}

export interface MargoSearchCategoryResults {
  users: MargoSearchHit[]
  lyrics: MargoSearchHit[]
  artists: MargoSearchHit[]
  catalogLines: MargoSearchHit[]
}

export interface MargoSearchResponse {
  query: string
  results: MargoSearchCategoryResults
  processingTimeMs: number
}
