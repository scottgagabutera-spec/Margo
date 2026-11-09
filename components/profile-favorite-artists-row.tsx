'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FavoriteArtistAvatar } from '@/components/favorite-artist-avatar'
import { PlusIcon } from '@/components/icons'
import type { ComposeSearchHit } from '@/components/compose-search-dropdown'
import type { ArtistSearchResult } from '@/lib/catalog-artist/search-client'
import {
  ProfileFavoritesSearchField,
  ProfileFavoritesSearchResults,
  useProfileFavoritesSearch,
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
  onFavoritesChange,
}: {
  favorites: ProfileFavoriteArtist[]
  isOwnProfile: boolean
  showEmptyOwnerLink?: boolean
  onFavoritesChange?: (next: ProfileFavoriteArtist[]) => void
}) {
  const [chip, setChip] = useState<FavoritesChip>('artists')
  const [inlineSearch, setInlineSearch] = useState<ProfileFavoritesSearchKind | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const carouselRef = useRef<HTMLDivElement>(null)
  const fieldRef = useRef<HTMLDivElement>(null)
  const searchActive = inlineSearch === chip
  const search = useProfileFavoritesSearch(chip, searchActive)

  if (!isOwnProfile && favorites.length === 0) return null

  const shown = favorites.slice(0, 12)
  const extra = favorites.length - shown.length
  const canAdd = isOwnProfile && showEmptyOwnerLink

  const resetCarousel = useCallback(() => {
    const el = carouselRef.current
    if (!el) return
    el.scrollTo({ left: 0, behavior: 'smooth' })
  }, [])

  const closeSearch = useCallback(() => {
    setInlineSearch(null)
    window.requestAnimationFrame(resetCarousel)
  }, [resetCarousel])

  const openSearch = useCallback(() => {
    setInlineSearch(chip)
  }, [chip])

  useEffect(() => {
    if (!searchActive) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSearch()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [searchActive, closeSearch])

  useEffect(() => {
    if (!searchActive) return
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null
      const panel = panelRef.current
      if (!panel || !target || panel.contains(target)) return
      closeSearch()
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
    }
  }, [searchActive, closeSearch])

  const persistArtists = useCallback(
    async (next: ProfileFavoriteArtist[]) => {
      onFavoritesChange?.(next)
      try {
        await fetch('/api/profile/favorite-artists', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            favorites: next.map((f, index) => ({
              catalogArtistId: f.id,
              position: index,
              artworkUrl: f.artworkUrl,
            })),
          }),
        })
      } catch {
        /* keep optimistic UI */
      }
    },
    [onFavoritesChange],
  )

  const onArtistPick = useCallback(
    async (hit: ArtistSearchResult) => {
      if (favorites.some((f) => f.id === hit.id) || favorites.length >= 10) {
        closeSearch()
        return
      }
      let artworkUrl = hit.artworkUrl || hit.previewArtworkUrl
      if (!artworkUrl) {
        try {
          const res = await fetch('/api/artists/materialize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ catalogArtistId: hit.id }),
          })
          if (res.ok) {
            const data = (await res.json()) as { artist?: { artworkUrl?: string | null } }
            artworkUrl = data.artist?.artworkUrl ?? null
          }
        } catch {
          /* optional artwork */
        }
      }
      const next: ProfileFavoriteArtist[] = [
        ...favorites,
        {
          id: hit.id,
          name: hit.name,
          artworkUrl,
          fallbackArtworkUrl: hit.previewArtworkUrl,
          onMargo: hit.onMargo,
          margoUsername: hit.margoUsername,
          position: favorites.length,
        },
      ]
      await persistArtists(next)
      closeSearch()
    },
    [closeSearch, favorites, persistArtists],
  )

  const onSongPick = useCallback(
    (_hit: ComposeSearchHit) => {
      closeSearch()
    },
    [closeSearch],
  )

  const plusLabel =
    chip === 'artists'
      ? 'Search for an artist'
      : chip === 'songs'
        ? 'Search for a song'
        : 'Search for an album'

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
        {searchActive ? (
          <div className="margo-profile-favorites__search-mode">
            <ProfileFavoritesSearchField
              kind={chip}
              query={search.query}
              setQuery={search.setQuery}
              searching={search.searching}
              onClose={closeSearch}
              fieldRef={fieldRef}
            />
            <ProfileFavoritesSearchResults
              kind={chip}
              query={search.query}
              searching={search.searching}
              dropdownOpen={search.dropdownOpen}
              artistResults={search.artistResults}
              songResults={search.songResults}
              onArtistPick={(hit) => { void onArtistPick(hit) }}
              onSongPick={onSongPick}
            />
          </div>
        ) : (
          <div
            ref={carouselRef}
            className={`margo-profile-favorites__carousel${searchActive ? ' margo-profile-favorites__carousel--leaving' : ''}`}
          >
            {canAdd ? <FavoritesPlusButton onClick={openSearch} label={plusLabel} /> : null}
            {chip === 'artists' &&
              shown.map((a, index) => {
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
            {chip === 'artists' && extra > 0 ? (
              <div className="margo-profile-favorite-artists__more" aria-label={`${extra} more favorite artists`}>
                +{extra}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
