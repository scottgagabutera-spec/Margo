'use client'

import type { ReactNode } from 'react'
import {
  FeedIconCard,
  FeedIconHeart,
  FeedIconHeartFilled,
  FeedIconLyricBack,
  FeedIconReplay,
} from '@/components/feed-card-icons'
import { formatEchoBadge } from '@/lib/post-card-lyric-layout'

export type FeedPostActionsProps = {
  variant?: 'feed' | 'compact'
  postId: string
  resonated: boolean
  resonateCount: number
  onResonate: (postId: string) => void
  lyricBackAllowed?: boolean
  lyricBackOpen?: boolean
  echoCount?: number
  onLyricBack?: () => void
  onCard: () => void
  replayed?: boolean
  replayCount?: number
  /** Feed: menu wrapper from PostCard. Compact: direct tap. */
  replaySlot?: ReactNode
  onReplayTap?: () => void
}

export function FeedPostActions({
  variant = 'feed',
  postId,
  resonated,
  resonateCount,
  onResonate,
  lyricBackAllowed = true,
  lyricBackOpen = false,
  echoCount = 0,
  onLyricBack,
  onCard,
  replayed = false,
  replayCount = 0,
  replaySlot,
  onReplayTap,
}: FeedPostActionsProps) {
  const compact = variant === 'compact'
  const rootClass = compact
    ? 'margo-feed-actions margo-feed-actions--compact'
    : 'margo-feed-actions'
  const echoBadge = formatEchoBadge(echoCount)

  return (
    <div className={rootClass} data-no-card-nav>
      <button
        type="button"
        className="margo-feed-action"
        aria-label={resonated ? 'Remove resonate' : 'Resonate'}
        onClick={(e) => {
          e.stopPropagation()
          onResonate(postId)
        }}
        style={{ color: resonated ? 'var(--gold)' : 'var(--text-secondary)' }}
      >
        <span className="margo-feed-action__icon-wrap">
          {resonated ? <FeedIconHeartFilled size={compact ? 18 : 20} /> : <FeedIconHeart size={compact ? 18 : 20} />}
          {resonateCount > 0 ? (
            <span className="margo-feed-action__badge">{resonateCount}</span>
          ) : null}
        </span>
        <span className="margo-feed-action__label">Resonate</span>
      </button>

      {lyricBackAllowed && onLyricBack ? (
        <button
          type="button"
          className="margo-feed-action"
          aria-label={lyricBackOpen ? 'Close Lyric Back' : 'Open Lyric Back'}
          aria-expanded={lyricBackOpen}
          onClick={(e) => {
            e.stopPropagation()
            onLyricBack()
          }}
          style={{ color: lyricBackOpen ? 'var(--post-vibe-text)' : 'var(--text-secondary)' }}
        >
          <span className="margo-feed-action__icon-wrap">
            <FeedIconLyricBack size={compact ? 18 : 20} />
            {echoBadge ? (
              <span className="margo-feed-action__badge">{echoBadge}</span>
            ) : null}
          </span>
          <span className="margo-feed-action__label">Lyric Back</span>
        </button>
      ) : null}

      <button
        type="button"
        className="margo-feed-action"
        aria-label="Export lyric card"
        onClick={(e) => {
          e.stopPropagation()
          onCard()
        }}
        style={{ color: 'var(--text-secondary)' }}
      >
        <span className="margo-feed-action__icon-wrap">
          <FeedIconCard size={compact ? 18 : 20} />
        </span>
        <span className="margo-feed-action__label">Card</span>
      </button>

      {replaySlot ?? (onReplayTap ? (
        <button
          type="button"
          className="margo-feed-action"
          aria-label={replayed ? 'Undo Replay' : 'Replay'}
          onClick={(e) => {
            e.stopPropagation()
            onReplayTap()
          }}
          style={{
            color: replayed ? 'var(--gold)' : 'var(--text-secondary)',
          }}
        >
          <span className="margo-feed-action__icon-wrap">
            <FeedIconReplay size={compact ? 18 : 20} />
            {replayCount > 0 ? (
              <span className="margo-feed-action__badge">{replayCount}</span>
            ) : null}
          </span>
          <span className="margo-feed-action__label">Replay</span>
        </button>
      ) : null)}
    </div>
  )
}
