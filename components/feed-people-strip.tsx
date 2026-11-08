'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MargoPortraitAvatar } from '@/components/margo-portrait-avatar'
import { MargoSectionHeader } from '@/components/margo-section-header'
import { CheckIcon, UserPlusIcon } from '@/components/icons'
import { UI_FONT } from '@/lib/fonts'
import type { FeedLyricsPeopleSlot } from '@/lib/feed-lyrics-mix'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { createClient } from '@/lib/supabase/client'
import { SignInLink } from '@/components/signin-link'
import { leaveFeedTo } from '@/lib/feed-exit-nav'

const font = UI_FONT
const supabase = createClient()

function FeedPeopleFollowButton({
  profileId,
  initialFollowing,
  onFollowed,
}: {
  profileId: string
  initialFollowing: boolean
  onFollowed: (id: string) => void
}) {
  const { user } = useAuthGate()
  const [following, setFollowing] = useState(initialFollowing)
  const [busy, setBusy] = useState(false)

  const toggle = useCallback(async () => {
    if (busy) return
    if (!user || user.is_anonymous) return
    setBusy(true)
    try {
      if (!following) {
        const { error } = await supabase.from('follows').insert({
          follower_id: user.id,
          followee_id: profileId,
        })
        if (!error) {
          setFollowing(true)
          onFollowed(profileId)
        }
      }
    } finally {
      setBusy(false)
    }
  }, [busy, following, onFollowed, profileId, user])

  if (!user || user.is_anonymous) {
    return (
      <SignInLink
        returnTo="/feed"
        className="margo-feed-people-strip__follow margo-feed-people-strip__follow--gold"
        aria-label="Sign in to follow"
      >
        <UserPlusIcon size={16} color="var(--bg)" />
        <span>Follow</span>
      </SignInLink>
    )
  }

  return (
    <button
      type="button"
      className={[
        'margo-feed-people-strip__follow',
        following ? 'margo-feed-people-strip__follow--following' : 'margo-feed-people-strip__follow--gold',
      ].join(' ')}
      disabled={busy || following}
      onClick={() => void toggle()}
      aria-label={following ? 'Following' : 'Follow'}
    >
      {following ? (
        <>
          <CheckIcon size={16} color="var(--gold)" />
          <span>Following</span>
        </>
      ) : (
        <>
          <UserPlusIcon size={16} color="var(--bg)" />
          <span>Follow</span>
        </>
      )}
    </button>
  )
}

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
    <div className="margo-feed-people-strip margo-pressable-surface">
      <MargoSectionHeader
        title="Who to follow"
        actionHref="/search?scope=people"
        actionLabel="See all"
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
              <span className="margo-feed-people-strip__display" style={{ fontFamily: font }}>
                {p.displayName}
              </span>
              <span className="margo-feed-people-strip__handle" style={{ fontFamily: font }}>
                @{p.username}
              </span>
            </button>
            <FeedPeopleFollowButton
              profileId={p.id}
              initialFollowing={followingIds.has(p.id)}
              onFollowed={onFollowed}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
