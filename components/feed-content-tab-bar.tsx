'use client'

import type { FeedContentTab } from '@/lib/feed-content-tab'

type Props = {
  active: FeedContentTab
  onChange: (tab: FeedContentTab) => void
  /** When false, Shorts tab is visible but shows empty state when selected. */
  shortsAvailable?: boolean
}

export function FeedContentTabBar({ active, onChange, shortsAvailable = true }: Props) {
  return (
    <div className="margo-feed-content-tab-bar" role="tablist" aria-label="Feed content">
      <button
        type="button"
        role="tab"
        aria-selected={active === 'lyrics'}
        className={`margo-feed-content-tab${active === 'lyrics' ? ' margo-feed-content-tab--active' : ''}`}
        onClick={() => onChange('lyrics')}
      >
        Lyrics
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === 'shorts'}
        className={`margo-feed-content-tab${active === 'shorts' ? ' margo-feed-content-tab--active' : ''}`}
        onClick={() => onChange('shorts')}
      >
        Shorts
      </button>
      {!shortsAvailable ? (
        <span className="margo-sr-only">Shorts catalog below minimum — empty state when opened</span>
      ) : null}
    </div>
  )
}
