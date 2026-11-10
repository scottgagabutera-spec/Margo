'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { MargoPortraitAvatar } from '@/components/margo-portrait-avatar'
import { MargoFollowButton } from '@/components/margo-follow-button'

type PortraitProps = {
  displayName: string
  username: string
  avatarUrl: string | null
  onAvatarClick?: () => void
  avatarBroken?: boolean
  onAvatarError?: () => void
}

export function ProfileHeroCluster({
  portrait,
  actionsRow,
}: {
  portrait: PortraitProps
  actionsRow?: ReactNode
}) {
  const { displayName, username, avatarUrl, onAvatarClick, avatarBroken, onAvatarError } = portrait
  const hasPhoto = !!avatarUrl?.trim() && !avatarBroken
  const initial = (displayName || username || '?').charAt(0).toUpperCase()

  const portraitNode = (
    <MargoPortraitAvatar
      size="profile"
      imageUrl={hasPhoto ? avatarUrl : null}
      onImageError={onAvatarError}
      fallbackInitial={initial}
      fallbackSeed={!hasPhoto ? username || displayName : null}
      separationRingColor="var(--bg)"
    />
  )

  return (
    <div className="margo-profile-hero-cluster-wrap">
      <div className="margo-profile-hero-cluster" data-testid="profile-hero-cluster">
        <div className="margo-profile-hero__portrait" data-testid="profile-portrait-photo">
          {hasPhoto && onAvatarClick ? (
            <button
              type="button"
              onClick={onAvatarClick}
              aria-label={`View ${displayName}'s photo`}
              className="margo-profile-hero__portrait-btn"
            >
              {portraitNode}
            </button>
          ) : (
            portraitNode
          )}
        </div>
      </div>
      {actionsRow ? <div className="margo-profile-hero-actions">{actionsRow}</div> : null}
    </div>
  )
}

function HeroActionLink({
  href,
  children,
  badgeCount,
}: {
  href: string
  children: ReactNode
  badgeCount?: number
}) {
  return (
    <Link href={href} className="margo-btn margo-btn--secondary margo-profile-hero-action">
      {children}
      {badgeCount && badgeCount > 0 ? (
        <span className="margo-signal-badge margo-profile-hero-action__badge" aria-hidden>
          {badgeCount > 9 ? '9+' : badgeCount}
        </span>
      ) : null}
    </Link>
  )
}

function HeroActionButton({
  children,
  onClick,
  disabled,
  title,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      className="margo-btn margo-btn--secondary margo-profile-hero-action"
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  )
}

export function ProfileHeroVisitorActions({
  signedOut,
  profileId,
  messageHref,
  messageDisabled,
  messageTitle,
  followLabel,
  followAccepted,
  onFollow,
  followBusy,
  socialReady,
  messageUnreadCount,
  signInReturnTo,
}: {
  signedOut?: boolean
  profileId: string
  messageHref?: string
  messageDisabled?: boolean
  messageTitle?: string
  followLabel: string
  followAccepted: boolean
  onFollow: () => void
  followBusy: boolean
  socialReady: boolean
  messageUnreadCount?: number
  signInReturnTo?: string
}) {
  const following = followAccepted || followLabel === 'Following'

  if (signedOut) {
    return (
      <MargoFollowButton
        profileId={profileId}
        signInReturnTo={signInReturnTo}
        onToggle={onFollow}
        following={false}
        label="Follow"
      />
    )
  }

  return (
    <>
      {messageHref ? (
        <HeroActionLink
          href={messageHref}
          badgeCount={messageUnreadCount}
        >
          Message
        </HeroActionLink>
      ) : (
        <HeroActionButton disabled={!socialReady || messageDisabled} title={messageTitle}>
          Message
        </HeroActionButton>
      )}
      <MargoFollowButton
        profileId={profileId}
        label={followLabel}
        following={following}
        busy={followBusy}
        disabled={!socialReady || followBusy || followLabel === 'Requested'}
        onToggle={onFollow}
      />
    </>
  )
}

export function ProfileHeroOwnerActions({
  messagesUnreadCount,
}: {
  messagesUnreadCount?: number
}) {
  return (
    <>
      <HeroActionLink href="/messages" badgeCount={messagesUnreadCount}>
        Messages
      </HeroActionLink>
      <HeroActionLink href="/profile/edit">
        Edit profile
      </HeroActionLink>
    </>
  )
}
