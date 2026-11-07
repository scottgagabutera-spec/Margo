export type MemoryVisibility = 'public' | 'followers' | 'only_me'
export type MemoryDateGranularity = 'day' | 'month' | 'year' | 'period' | 'none'

export type MemorySongInput = {
  position: number
  songId?: string | null
  songTitle: string
  artistName: string
  lyricExcerpt?: string | null
  isLyricOnly: boolean
}

export type MemoryPhotoInput = {
  position: number
  r2Key: string
  width?: number | null
  height?: number | null
}

export type MemoryPublic = {
  id: string
  ownerProfileId: string
  ownerUsername: string
  ownerDisplayName: string
  ownerAvatarUrl: string | null
  title: string
  story: string | null
  mood: string | null
  visibility: MemoryVisibility
  showInLyricsFeed: boolean
  showDatePublicly: boolean
  dateGranularity: MemoryDateGranularity
  dateStart: string | null
  dateEnd: string | null
  coverUrl: string | null
  songCount: number
  resonateCount: number
  lyricBackCount: number
  createdAt: string
  songs: Array<{
    id: string
    position: number
    songId: string | null
    songTitle: string
    artistName: string
    lyricExcerpt: string | null
    isLyricOnly: boolean
    artworkUrl: string | null
    audioUrl: string | null
  }>
  photos: Array<{
    id: string
    position: number
    url: string
    width: number | null
    height: number | null
  }>
  viewerResonated: boolean
  isOwner: boolean
}
