'use client'

/**
 * Reserved slot for a future AI Suggested Lyric Back.
 * Intentionally renders nothing until matching logic ships — keeps Layout A
 * structure stable without acting like the manual Lyric Back action.
 */
export type SuggestedLyricBack = {
  text: string
  songTitle?: string | null
  artistName?: string | null
  songId?: string | null
  lyricLineId?: string | null
  startSec?: number | null
  endSec?: number | null
}

export type PostCardSuggestedReplyProps = {
  suggestedReply?: SuggestedLyricBack | null
  onAcceptSuggested?: (suggestion: SuggestedLyricBack) => void
  onOpenSuggestedSearch?: () => void
}

export function PostCardSuggestedReply(_props: PostCardSuggestedReplyProps) {
  return null
}
