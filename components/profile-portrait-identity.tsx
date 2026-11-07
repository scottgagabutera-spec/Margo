'use client'

import type { ReactNode } from 'react'
import { MargoPortraitAvatar } from '@/components/margo-portrait-avatar'
import { isMargoBrandUsername } from '@/lib/margo-brand-account'
import { ArtistBadge, type ArtistStatus } from '@/components/artist-badge'

type PortraitBaseProps = {
  displayName: string
  username: string
  avatarUrl: string | null
  onAvatarClick?: () => void
  avatarBroken?: boolean
  onAvatarError?: () => void
}

function usePortraitVisuals({
  displayName,
  username,
  avatarUrl,
  avatarBroken,
}: PortraitBaseProps) {
  const brandMark = isMargoBrandUsername(username)
  const hasPhoto = !!avatarUrl?.trim() && !avatarBroken
  const initial = (displayName || username || '?').charAt(0).toUpperCase()
  return { brandMark, hasPhoto, initial }
}

export function ProfilePortraitPhoto({
  displayName,
  username,
  avatarUrl,
  onAvatarClick,
  avatarBroken,
  onAvatarError,
}: PortraitBaseProps) {
  const { brandMark, hasPhoto, initial } = usePortraitVisuals({
    displayName,
    username,
    avatarUrl,
    avatarBroken,
  })
  const portrait = (
    <MargoPortraitAvatar
      size="profile"
      imageUrl={hasPhoto ? avatarUrl : null}
      onImageError={onAvatarError}
      fallbackInitial={initial}
      fallbackSeed={!hasPhoto && !brandMark ? username || displayName : null}
      brandMark={brandMark}
      separationRingColor="var(--bg)"
    />
  )

  return (
    <div className="margo-profile-hero margo-profile-hero--portrait-only" data-testid="profile-portrait-hero">
      <div className="margo-profile-hero__portrait" data-testid="profile-portrait-photo">
        {hasPhoto && onAvatarClick ? (
          <button
            type="button"
            onClick={onAvatarClick}
            aria-label={`View ${displayName}'s photo`}
            className="margo-profile-hero__portrait-btn"
          >
            {portrait}
          </button>
        ) : (
          portrait
        )}
      </div>
    </div>
  )
}

export function ProfileIdentityBlock({
  displayName,
  username,
  isPrivate,
  isArtist,
  artistStatus,
}: {
  displayName: string
  username: string
  isPrivate?: boolean
  isArtist?: boolean
  artistStatus?: ArtistStatus
}) {
  const brandMark = isMargoBrandUsername(username)
  return (
    <div className="margo-profile-identity" data-testid="profile-identity-block">
      <div className="margo-profile-identity__name-row">
        <h1 className="margo-profile-identity__name">{displayName}</h1>
        <span className="margo-feed-author-role-slot" data-testid="profile-author-role-slot" aria-hidden />
        {isPrivate ? (
          <span className="margo-profile-identity__private-pill">Private</span>
        ) : null}
      </div>
      <p className="margo-profile-identity__handle">@{username}</p>
      <span className="margo-profile-role-third-slot" data-testid="profile-role-third-slot">
        {brandMark ? (
          <span className="margo-role-line margo-role-line--brand" data-testid="margo-role-line">
            Music label
          </span>
        ) : (
          <ArtistBadge isArtist={!!isArtist} artistStatus={artistStatus} presentation="line" />
        )}
      </span>
    </div>
  )
}

export function ProfilePortraitIdentity({
  displayName,
  username,
  avatarUrl,
  isPrivate,
  isArtist,
  artistStatus,
  onAvatarClick,
  avatarBroken,
  onAvatarError,
}: PortraitBaseProps & {
  isPrivate?: boolean
  isArtist?: boolean
  artistStatus?: ArtistStatus
}) {
  return (
    <>
      <ProfilePortraitPhoto
        displayName={displayName}
        username={username}
        avatarUrl={avatarUrl}
        onAvatarClick={onAvatarClick}
        avatarBroken={avatarBroken}
        onAvatarError={onAvatarError}
      />
      <ProfileIdentityBlock
        displayName={displayName}
        username={username}
        isPrivate={isPrivate}
        isArtist={isArtist}
        artistStatus={artistStatus}
      />
    </>
  )
}

export function ProfilePortraitActions({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <div className="margo-profile-actions" data-testid="profile-actions-row">
      {children}
    </div>
  )
}
