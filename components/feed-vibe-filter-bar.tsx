'use client'

import { UI_FONT } from '@/lib/fonts'
import { getVibeTheme } from '@/lib/vibe-theme'
import { emotionToVibeLabel } from '@/lib/moment/vibe'

type Props = {
  vibeKey: string
  resultCount: number | null
  onClear: () => void
}

export function FeedVibeFilterBar({ vibeKey, resultCount, onClear }: Props) {
  const label = emotionToVibeLabel(vibeKey) || vibeKey
  const theme = getVibeTheme(vibeKey)

  return (
    <div
      className="margo-feed-vibe-bar"
      role="region"
      aria-label={`Feed filtered by ${label}`}
    >
      <span className="margo-feed-vibe-bar__dot" style={{ background: theme.fill }} aria-hidden />
      <span className="margo-feed-vibe-bar__label">{label}</span>
      {resultCount != null ? (
        <span className="margo-feed-vibe-bar__count">{resultCount}</span>
      ) : null}
      <button
        type="button"
        className="margo-feed-vibe-bar__clear"
        aria-label={`Clear ${label} filter`}
        onClick={onClear}
      >
        ✕
      </button>
    </div>
  )
}

/** Screen reader announcements for filter changes. */
export function FeedFilterLiveRegion({ message }: { message: string }) {
  return (
    <div
      className="margo-sr-only"
      aria-live="polite"
      aria-atomic="true"
    >
      {message}
    </div>
  )
}
