'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { FavoriteArtistAvatar } from '@/components/favorite-artist-avatar'
import { PlusIcon } from '@/components/icons'
import {
  ProfileFavoritesInlineSearch,
  type ProfileFavoritesSearchKind,
} from '@/components/profile-favorites-inline-search'
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

function FavoritesPlusButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      className="margo-profile-favorites__plus"
      aria-label={label}
      onClick={onClick}
    >
      <PlusIcon size={18} color="var(--gold)" />
    </button>
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
  const [inlineSearch, setInlineSearch] = useState<ProfileFavoritesSearchKind | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  if (!isOwnProfile && favorites.length === 0) return null

  const shown = favorites.slice(0, 12)
  const extra = favorites.length - shown.length
  const canAdd = isOwnProfile && showEmptyOwnerLink
  const searchActive = inlineSearch === chip

  const openSearch = () => {
    setInlineSearch(chip)
  }

  const closeSearch = () => {
    setInlineSearch(null)
  }

  return (
    <div className="margo-profile-favorites" ref={panelRef}>
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
              onClick={() => {
                setChip(id)
                closeSearch()
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      <div className="margo-profile-favorites__panel">
        <div className="margo-profile-favorites__carousel">
          {chip === 'artists' && favorites.length > 0 ? (
            <>
              {shown.map((a, index) => {
                const inner = (
                  <>
                    <span className="margo-profile-favorite-artists__art-wrap">
                      <FavoriteArtistAvatar
                        name={a.name}
                        artworkUrl={a.artworkUrl}
                        fallbackArtworkUrl={a.fallbackArtworkUrl}
                        priority={index < 6}
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
            </>
          ) : null}

          {searchActive ? (
            <div className="margo-profile-favorites__search-cell">
              <ProfileFavoritesInlineSearch
                kind={chip}
                onClose={closeSearch}
                boundaryRef={panelRef}
              />
            </div>
          ) : canAdd ? (
            <FavoritesPlusButton
              onClick={openSearch}
              label={
                chip === 'artists'
                  ? 'Search for an artist'
                  : chip === 'songs'
                    ? 'Search for a song'
                    : 'Search for an album'
              }
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
