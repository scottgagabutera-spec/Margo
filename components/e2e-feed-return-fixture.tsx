'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FeedMemoryPromoCard } from '@/components/feed-memory-promo-card'
import { FeedEchoesResultsBlock } from '@/components/feed-echoes-results-block'
import { E2E_FEED_RETURN_ECHOES } from '@/lib/e2e-feed-return-fixture'
import { armFeedStackLinkCapture } from '@/lib/feed-stack-capture'
import { navigateFromFeed } from '@/lib/feed-stack-nav'

/** Deterministic feed blocks for Playwright return-position tests (non-production hosts only). */
export function E2eFeedReturnFixture() {
  const router = useRouter()
  const [root, setRoot] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!root) return
    return armFeedStackLinkCapture(root)
  }, [root])

  return (
    <div ref={setRoot} className="margo-feed-e2e-return" style={{ minHeight: '120vh', padding: '12px 16px' }}>
      <div className="margo-feed-memories-row__scroller" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16 }}>
        <button
          type="button"
          className="margo-feed-memory-row-tile"
          style={{ minWidth: 120, height: 80, display: 'block', background: 'var(--surface-2)', border: 'none', padding: 8, cursor: 'pointer' }}
          onClick={() => navigateFromFeed(router, '/e2e/feed-stack-depth?from=memory-tile', 'lyrics')}
        >
          Memory tile
        </button>
      </div>

      <section className="margo-feed-shorts-strip" aria-label="Shorts fixture">
        <div className="margo-feed-shorts-strip__row" style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
          <button
            type="button"
            className="margo-feed-shorts-strip__tile"
            style={{ minWidth: 72, minHeight: 72, border: '1px solid var(--border)', background: 'var(--surface-2)' }}
            onClick={() => navigateFromFeed(router, '/feed?tab=shorts&shortsAt=0&e2eShorts=1&e2eFeedReturn=1', 'lyrics')}
          />
        </div>
      </section>

      <article className="margo-post-card" style={{ marginBottom: 16, padding: 12, border: '1px solid var(--border)' }}>
        <button
          type="button"
          style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', padding: 0, font: 'inherit' }}
          onClick={() => navigateFromFeed(router, '/e2e/feed-stack-depth?from=profile', 'lyrics')}
        >
          Open profile depth
        </button>
      </article>

      <div data-feed-exit="people" style={{ marginBottom: 16 }}>
        <button type="button" onClick={() => navigateFromFeed(router, '/e2e/feed-stack-depth?from=people', 'lyrics')}>
          Who to follow (fixture)
        </button>
      </div>

      <div className="margo-feed-block-shell" style={{ marginBottom: 12 }}>
        <FeedMemoryPromoCard promoKind="memory" hrefOverride="/e2e/feed-stack-depth?from=create-memory" />
      </div>
      <div className="margo-feed-block-shell" style={{ marginBottom: 12 }}>
        <FeedMemoryPromoCard promoKind="pictures" hrefOverride="/e2e/feed-stack-depth?from=create-pictures" />
      </div>
      <div className="margo-feed-block-shell" style={{ marginBottom: 12 }}>
        <FeedMemoryPromoCard promoKind="story" hrefOverride="/e2e/feed-stack-depth?from=create-story" />
      </div>

      <FeedEchoesResultsBlock block={E2E_FEED_RETURN_ECHOES} />

      <div style={{ height: 800 }} aria-hidden />
    </div>
  )
}
