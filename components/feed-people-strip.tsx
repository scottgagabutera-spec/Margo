'use client'

import Link from 'next/link'
import { UI_FONT } from '@/lib/fonts'
import type { FeedLyricsPeopleSlot } from '@/lib/feed-lyrics-mix'

const font = UI_FONT

export function FeedPeopleStrip({ people }: { people: FeedLyricsPeopleSlot[] }) {
  if (!people.length) return null
  return (
    <div className="margo-feed-people-strip">
      <p className="margo-feed-people-strip__label">People on Margo</p>
      <div className="margo-feed-people-strip__row">
        {people.map((p) => (
          <Link key={p.id} href={`/profile/${p.username}`} className="margo-feed-people-strip__cell">
            {p.avatarUrl ? (
              <img src={p.avatarUrl} alt="" className="margo-feed-people-strip__avatar" loading="lazy" />
            ) : (
              <span className="margo-feed-people-strip__avatar margo-feed-people-strip__avatar--empty" />
            )}
            <span className="margo-feed-people-strip__name" style={{ fontFamily: font }}>
              {p.displayName || p.username}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
