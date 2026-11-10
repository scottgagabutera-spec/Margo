'use client'

import { useRouter } from 'next/navigation'
import { MargoPortraitAvatar } from '@/components/margo-portrait-avatar'
import { MargoSectionHeader } from '@/components/margo-section-header'
import { UI_FONT } from '@/lib/fonts'
import type { FeedLyricsPeopleSlot } from '@/lib/feed-lyrics-mix'
import { leaveFeedTo } from '@/lib/feed-exit-nav'
import { MargoFollowButton } from '@/components/margo-follow-button'

const font = UI_FONT

export function FeedPeopleStrip({
  people,
  followingIds,
  onFollowed,
}: {
  people: FeedLyricsPeopleSlot[]
  followingIds: Set<string>
  onFollowed: (id: string) => void
}) {
  const router = useRouter()
  if (!people.length) return null

  return (
    <div className="margo-feed-people-strip margo-pressable-surface" data-feed-exit="people">
      <MargoSectionHeader
        title="Who to follow"
        action={
          <button
            type="button"
            className="margo-section-header__action"
            onClick={() => leaveFeedTo(router, '/search?scope=people', 'lyrics')}
          >
            See all
          </button>
        }
      />
      <div className="margo-feed-people-strip__row">
        {people.map((p) => (
          <div key={p.id} className="margo-feed-people-strip__cell">
            <button
              type="button"
              className="margo-feed-people-strip__identity"
              onClick={() => leaveFeedTo(router, `/profile/${p.username}`, 'lyrics')}
              aria-label={`Open @${p.username}`}
            >
              <MargoPortraitAvatar
                size="feed"
                imageUrl={p.avatarUrl}
                fallbackInitial={(p.displayName || p.username).charAt(0).toUpperCase()}
                fallbackSeed={p.username}
                className="margo-feed-people-strip__portrait"
                separationRingColor="var(--surface)"
              />
              <span className="margo-feed-people-strip__handle" style={{ fontFamily: font }}>
                @{p.username}
              </span>
            </button>
            <MargoFollowButton
              profileId={p.id}
              initialFollowing={followingIds.has(p.id)}
              signInReturnTo="/feed"
              className="margo-feed-people-strip__follow"
              onFollowed={onFollowed}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
