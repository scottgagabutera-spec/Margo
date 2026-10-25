'use client'

import type { ReactNode } from 'react'
import { MargoPortraitAvatar } from '@/components/margo-portrait-avatar'
import { isMargoBrandUsername } from '@/lib/margo-brand-account'
import { ArtistBadge, type ArtistStatus } from '@/components/artist-badge'
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
}: {
  displayName: string
  username: string
  avatarUrl: string | null
  isPrivate?: boolean
  isArtist?: boolean
  artistStatus?: ArtistStatus
  onAvatarClick?: () => void
  avatarBroken?: boolean
  onAvatarError?: () => void
}) {
  const brandMark = isMargoBrandUsername(username)
  const hasPhoto = !!avatarUrl?.trim() && !avatarBroken
  const initial = (displayName || username || '?').charAt(0).toUpperCase()

  const portrait = (
    <MargoPortraitAvatar
      size="profile"
      imageUrl={hasPhoto ? avatarUrl : null}
      onImageError={onAvatarError}
      fallbackInitial={initial}
      brandMark={brandMark}
      separationRingColor="var(--bg)"
    />
  )

  return (
    <div className="margo-profile-hero" data-testid="profile-portrait-hero">
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
      <div className="margo-profile-identity" data-testid="profile-identity-block">
        <div className="margo-profile-identity__name-row">
          <h1 className="margo-profile-identity__name">{displayName}</h1>
          <span className="margo-feed-author-role-slot" data-testid="profile-author-role-slot" aria-hidden />
          <ArtistBadge isArtist={!!isArtist} artistStatus={artistStatus} size={13} label />
          {isPrivate ? (
            <span className="margo-profile-identity__private-pill">Private</span>
          ) : null}
        </div>
        <p className="margo-profile-identity__handle">@{username}</p>
        <span className="margo-profile-role-third-slot" data-testid="profile-role-third-slot" aria-hidden />
      </div>
    </div>
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
