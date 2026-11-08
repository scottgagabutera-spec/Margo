'use client'

import type { FeedContentTab } from '@/lib/feed-content-tab'
import { useTapAck } from '@/hooks/use-tap-ack'

type Props = {
  active: FeedContentTab
  onChange: (tab: FeedContentTab) => void
  /** When false, Shorts tab is visible but shows empty state when selected. */
  shortsAvailable?: boolean
}

export function FeedContentTabBar({ active, onChange, shortsAvailable = true }: Props) {
  const { ack, isAcked } = useTapAck()
  const tabProps = (tab: FeedContentTab) => ({
    'data-margo-acked': isAcked(tab) && active !== tab ? 1 : undefined,
    onPointerDown: () => ack(tab),
    onClick: () => onChange(tab),
  })
  return (
    <div className="margo-feed-content-tab-bar" role="tablist" aria-label="Feed content">
      <button
        type="button"
        role="tab"
        aria-selected={active === 'lyrics'}
        className={`margo-feed-content-tab${active === 'lyrics' ? ' margo-feed-content-tab--active' : ''}`}
        {...tabProps('lyrics')}
      >
        Lyrics
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === 'memories'}
        className={`margo-feed-content-tab${active === 'memories' ? ' margo-feed-content-tab--active' : ''}`}
        {...tabProps('memories')}
      >
        Memories
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === 'shorts'}
        className={`margo-feed-content-tab${active === 'shorts' ? ' margo-feed-content-tab--active' : ''}`}
        {...tabProps('shorts')}
      >
        Shorts
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === 'echoes'}
        className={`margo-feed-content-tab${active === 'echoes' ? ' margo-feed-content-tab--active' : ''}`}
        {...tabProps('echoes')}
      >
        Echoes
      </button>
      {!shortsAvailable ? (
        <span className="margo-sr-only">Shorts catalog below minimum — empty state when opened</span>
      ) : null}
    </div>
  )
}
