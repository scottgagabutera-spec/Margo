'use client'

import Link from 'next/link'
import { UI_FONT } from '@/lib/fonts'

const font = UI_FONT

export function FeedMemoryNudge() {
  return (
    <div className="margo-feed-memory-nudge">
      <p className="margo-feed-memory-nudge__copy" style={{ fontFamily: font }}>
        Turn your soundtrack into a memory — songs, photos, and the story behind them.
      </p>
      <Link
        href="/memories/new"
        className="margo-feed-memory-nudge__cta"
        style={{ fontFamily: font }}
        onClick={() => {
          try { localStorage.setItem('margo-feed-memory-nudge-dismissed', String(Date.now())) } catch { /* ignore */ }
        }}
      >
        Create your first memory
      </Link>
    </div>
  )
}
