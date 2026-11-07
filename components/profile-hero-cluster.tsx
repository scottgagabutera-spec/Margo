'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { CheckIcon, EditIcon, MessagesIcon, ShareIcon, UserPlusIcon } from '@/components/icons'
import { MargoPortraitAvatar } from '@/components/margo-portrait-avatar'

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
  leftFlank,
  rightFlank,
}: {
  portrait: PortraitProps
  leftFlank?: ReactNode
  rightFlank?: ReactNode
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
    <div className="margo-profile-hero-cluster" data-testid="profile-hero-cluster">
      <div className="margo-profile-hero-cluster__flank margo-profile-hero-cluster__flank--start">{leftFlank}</div>
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
      <div className="margo-profile-hero-cluster__flank margo-profile-hero-cluster__flank--end">{rightFlank}</div>
    </div>
  )
}

function RoundFlankAction({
  label,
  ariaLabel,
  onClick,
  href,
  disabled,
  title,
  tone,
  children,
}: {
  label: string
  ariaLabel: string
  onClick?: () => void
  href?: string
  disabled?: boolean
  title?: string
  tone: 'gold' | 'outline' | 'following'
  children: ReactNode
}) {
  const className = `margo-profile-round-action margo-profile-round-action--${tone}${
    disabled ? ' margo-profile-round-action--disabled' : ''
  }`

  const inner = (
    <>
      <span className="margo-profile-round-action__icon">{children}</span>
      <span className="margo-profile-round-action__label">{label}</span>
    </>
  )

  if (href && !disabled) {
    return (
      <Link href={href} className={className} aria-label={ariaLabel}>
        {inner}
      </Link>
    )
  }

  return (
    <button
      type="button"
      className={className}
      aria-label={ariaLabel}
      disabled={disabled}
      title={title}
      onClick={onClick}
    >
      {inner}
    </button>
  )
}

export function ProfileHeroVisitorActions({
  messageHref,
  messageDisabled,
  messageTitle,
  followLabel,
  followAccepted,
  onFollow,
  followBusy,
  socialReady,
}: {
  messageHref?: string
  messageDisabled?: boolean
  messageTitle?: string
  followLabel: string
  followAccepted: boolean
  onFollow: () => void
  followBusy: boolean
  socialReady: boolean
}) {
  const following = followAccepted || followLabel === 'Following'
  return {
    left: (
      <RoundFlankAction
        label="Message"
        ariaLabel="Message"
        href={messageHref}
        disabled={!socialReady || messageDisabled || !messageHref}
        title={messageTitle}
        tone="outline"
      >
        <MessagesIcon size={18} color="var(--gold)" />
      </RoundFlankAction>
    ),
    right: (
      <RoundFlankAction
        label={following ? 'Following' : 'Follow'}
        ariaLabel={following ? 'Following' : 'Follow'}
        onClick={onFollow}
        disabled={!socialReady || followBusy}
        tone={following ? 'following' : 'gold'}
      >
        {following ? (
          <CheckIcon size={18} color="var(--gold)" />
        ) : (
          <UserPlusIcon size={18} color="var(--bg)" />
        )}
      </RoundFlankAction>
    ),
  }
}

export function ProfileHeroOwnerActions({
  onShare,
  shareBusy,
}: {
  onShare: () => void
  shareBusy: boolean
}) {
  return {
    left: (
      <RoundFlankAction label="Edit profile" ariaLabel="Edit profile" href="/profile/edit" tone="outline">
        <EditIcon size={18} color="var(--gold)" />
      </RoundFlankAction>
    ),
    right: (
      <RoundFlankAction
        label="Share"
        ariaLabel="Share profile"
        onClick={onShare}
        disabled={shareBusy}
        tone="outline"
      >
        <ShareIcon size={18} color="var(--gold)" />
      </RoundFlankAction>
    ),
  }
}
