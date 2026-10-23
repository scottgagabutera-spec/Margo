'use client'

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
  /** Nested/thread focus: session active but not a toggle highlight (muted). */
  lyricBackSessionActive?: boolean
  echoCount?: number
  onLyricBack?: () => void
  onCard: () => void
  replayed?: boolean
  replayCount?: number
  onReplayTap?: () => void
  /** Shell row: Resonate / Card / Repost visible but inert (not in a11y tree). */
  secondaryActionsInactive?: boolean
}

export function FeedPostActions({
  variant = 'feed',
  postId,
  resonated,
  resonateCount,
  onResonate,
  lyricBackAllowed = true,
  lyricBackOpen = false,
  lyricBackSessionActive = false,
  echoCount = 0,
  onLyricBack,
  onCard,
  replayed = false,
  replayCount = 0,
  onReplayTap,
  secondaryActionsInactive = false,
}: FeedPostActionsProps) {
  const compact = variant === 'compact'
  const rootClass = compact
    ? 'margo-feed-actions margo-feed-actions--compact'
    : 'margo-feed-actions'
  const echoBadge = formatEchoBadge(echoCount)
  const inert = secondaryActionsInactive

  return (
    <div className={rootClass} data-no-card-nav>
      <button
        type="button"
        className={`margo-feed-action${inert ? ' margo-feed-action--inactive' : ''}`}
        aria-label={resonated ? 'Remove resonate' : 'Resonate'}
        aria-hidden={inert ? true : undefined}
        tabIndex={inert ? -1 : undefined}
        disabled={inert}
        onClick={(e) => {
          e.stopPropagation()
          if (inert) return
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
          className={`margo-feed-action${lyricBackSessionActive ? ' margo-feed-action--lb-session' : ''}`}
          aria-label={
            lyricBackSessionActive
              ? 'Lyric Back — replying here'
              : lyricBackOpen
                ? 'Close Lyric Back'
                : 'Open Lyric Back'
          }
          aria-expanded={lyricBackOpen || lyricBackSessionActive}
          onClick={(e) => {
            e.stopPropagation()
            onLyricBack()
          }}
          style={{
            color: lyricBackSessionActive
              ? 'var(--text-muted)'
              : lyricBackOpen
                ? 'var(--post-vibe-text)'
                : 'var(--text-secondary)',
          }}
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
        className={`margo-feed-action${inert ? ' margo-feed-action--inactive' : ''}`}
        aria-label="Export lyric card"
        aria-hidden={inert ? true : undefined}
        tabIndex={inert ? -1 : undefined}
        disabled={inert}
        onClick={(e) => {
          e.stopPropagation()
          if (inert) return
          onCard()
        }}
        style={{ color: 'var(--text-secondary)' }}
      >
        <span className="margo-feed-action__icon-wrap">
          <FeedIconCard size={compact ? 18 : 20} />
        </span>
        <span className="margo-feed-action__label">Card</span>
      </button>

      {onReplayTap ? (
        <button
          type="button"
          className={`margo-feed-action${inert ? ' margo-feed-action--inactive' : ''}`}
          aria-label="Repost"
          aria-pressed={replayed}
          aria-hidden={inert ? true : undefined}
          tabIndex={inert ? -1 : undefined}
          disabled={inert}
          onClick={(e) => {
            e.stopPropagation()
            if (inert) return
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
          <span className="margo-feed-action__label">Repost</span>
        </button>
      ) : null}
    </div>
  )
}
