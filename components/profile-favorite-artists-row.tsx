'use client'

import Link from 'next/link'
import { FavoriteArtistAvatar } from '@/components/favorite-artist-avatar'
import { UI_FONT, TYPE } from '@/lib/fonts'

const font = UI_FONT

export type ProfileFavoriteArtist = {
  id: string
  name: string
  artworkUrl: string | null
  fallbackArtworkUrl?: string | null
  onMargo: boolean
  margoUsername: string | null
  position: number
}

export function ProfileFavoriteArtistsRow({
  favorites,
  isOwnProfile,
  showEmptyOwnerLink,
}: {
  favorites: ProfileFavoriteArtist[]
  isOwnProfile: boolean
  showEmptyOwnerLink?: boolean
}) {
  if (favorites.length === 0) {
    if (isOwnProfile && showEmptyOwnerLink) {
      return (
        <div className="margo-profile-favorite-artists margo-profile-favorite-artists--empty">
          <Link href="/profile/edit#favorite-artists" className="margo-profile-favorite-artists__empty-link">
            Add favorite artists
          </Link>
        </div>
      )
    }
    return null
  }

  const shown = favorites.slice(0, 5)
  const extra = favorites.length - shown.length

  return (
    <div className="margo-profile-favorite-artists">
      <p className="margo-profile-ui-label margo-profile-favorite-artists__label">Favorite artists</p>
      <div className="margo-profile-favorite-artists__row">
        {shown.map((a, index) => {
          const inner = (
            <>
              <span className="margo-profile-favorite-artists__art-wrap">
                <FavoriteArtistAvatar
                  name={a.name}
                  artworkUrl={a.artworkUrl}
                  fallbackArtworkUrl={a.fallbackArtworkUrl}
                  priority={index < 5}
                />
              </span>
              <span className="margo-profile-favorite-artists__name" style={{ fontFamily: font, fontSize: '0.6875rem' }}>
                {a.name}
              </span>
            </>
          )
          if (a.onMargo && a.margoUsername) {
            return (
              <Link
                key={a.id}
                href={`/profile/${a.margoUsername}`}
                className="margo-profile-favorite-artists__cell margo-profile-favorite-artists__cell--link"
              >
                {inner}
              </Link>
            )
          }
          return (
            <div key={a.id} className="margo-profile-favorite-artists__cell">
              {inner}
            </div>
          )
        })}
        {extra > 0 ? (
          <div className="margo-profile-favorite-artists__more" aria-label={`${extra} more favorite artists`}>
            +{extra}
          </div>
        ) : null}
      </div>
    </div>
  )
}
