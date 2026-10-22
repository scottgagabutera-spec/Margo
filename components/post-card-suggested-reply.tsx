'use client'

import { LyricBackFeedPanel } from '@/components/lyric-back-focus-panel'
import type { Echo } from '@/hooks/useEchoes'

export type PostCardSuggestedReplyProps = {
  postId: string
  echoCount: number
  parentUsername?: string | null
  parentEmotion: string
  open: boolean
  onClose: () => void
  onRequireAuth?: () => boolean
  onOpenThread?: (echoId: string) => void
  onExportEcho?: (echo: Echo) => void
  onReplayEcho?: (echoId: string) => void
  onQuoteReplayEcho?: (echoId: string, note: string) => void
  onUndoReplayEcho?: (echoId: string) => void
  echoReplayed?: (echoId: string) => boolean
  echoReplayCount?: (echoId: string) => number
  echoReplayNote?: (echoId: string) => string | null
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
    onQuoteReplayEcho,
    onUndoReplayEcho,
    echoReplayed,
    echoReplayCount,
    echoReplayNote,
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
      onQuoteReplayEcho={onQuoteReplayEcho}
      onUndoReplayEcho={onUndoReplayEcho}
      echoReplayed={echoReplayed}
      echoReplayCount={echoReplayCount}
      echoReplayNote={echoReplayNote}
    />
  )
}
