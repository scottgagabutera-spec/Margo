'use client'

import Link from 'next/link'
import { useState } from 'react'
import { FavoriteArtistAvatar } from '@/components/favorite-artist-avatar'
import { PlusIcon } from '@/components/icons'
import { UI_FONT } from '@/lib/fonts'

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

type FavoritesChip = 'artists' | 'songs' | 'albums'

function FavoritesEmptyPlus() {
  return (
    <div className="margo-profile-favorites__panel margo-profile-favorites__panel--empty">
      <span className="margo-profile-favorites__empty-plus" aria-hidden>
        <PlusIcon size={22} color="var(--gold)" />
      </span>
    </div>
  )
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
  const [chip, setChip] = useState<FavoritesChip>('artists')

  if (!isOwnProfile && favorites.length === 0) return null

  const shown = favorites.slice(0, 5)
  const extra = favorites.length - shown.length
  const ownerArtistsEmpty = isOwnProfile && favorites.length === 0 && showEmptyOwnerLink

  return (
    <div className="margo-profile-favorites">
      <div className="margo-profile-favorites__chips" role="tablist" aria-label="Favorites">
        {(['artists', 'songs', 'albums'] as const).map((id) => {
          const label = id === 'artists' ? 'Artists' : id === 'songs' ? 'Songs' : 'Albums'
          const selected = chip === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`margo-profile-favorites__chip${selected ? ' margo-profile-favorites__chip--on' : ''}`}
              onClick={() => setChip(id)}
            >
              {label}
            </button>
          )
        })}
      </div>

      {chip === 'songs' || chip === 'albums' ? <FavoritesEmptyPlus /> : null}

      {chip === 'artists' && ownerArtistsEmpty ? (
        <Link href="/profile/edit#favorite-artists" className="margo-profile-favorite-artists__empty-cta">
          <span className="margo-profile-favorite-artists__empty-plus" aria-hidden>
            <PlusIcon size={20} color="var(--bg)" />
          </span>
          <span className="margo-profile-favorite-artists__empty-text">Add your favorite artists</span>
        </Link>
      ) : null}

      {chip === 'artists' && favorites.length > 0 ? (
        <div className="margo-profile-favorite-artists__row margo-profile-favorites__artists-row">
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
                <span className="margo-profile-favorite-artists__name" style={{ fontFamily: font }}>
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
      ) : null}
    </div>
  )
}
