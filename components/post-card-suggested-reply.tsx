'use client'

import { LyricBackFeedPanel } from '@/components/lyric-back-focus-panel'
import type { Echo } from '@/hooks/useEchoes'

export type PostCardSuggestedReplyProps = {
  postId: string
  echoCount: number
  parentUsername?: string | null
  parentEmotion: string
  parentMoment?: {
    text?: string
    song?: string | null
    artist?: string | null
  }
  open: boolean
  onClose: () => void
  onRequireAuth?: () => boolean
  onOpenThread?: (echoId: string) => void
  onExportEcho?: (echo: Echo) => void
  onReplayEcho?: (echoId: string) => void
}

export function PostCardSuggestedReply(props: PostCardSuggestedReplyProps) {
  const {
    postId,
    echoCount,
    parentUsername,
    parentEmotion,
    open,
    onClose,
    onRequireAuth,
    onOpenThread,
    onExportEcho,
    onReplayEcho,
  } = props

  return (
    <LyricBackFeedPanel
      postId={postId}
      echoCount={echoCount}
      parentUsername={parentUsername}
      parentEmotion={parentEmotion}
      open={open}
      onClose={onClose}
      onRequireAuth={onRequireAuth}
      onOpenThread={onOpenThread}
      onExportEcho={onExportEcho}
      onReplayEcho={onReplayEcho}
    />
  )
}
