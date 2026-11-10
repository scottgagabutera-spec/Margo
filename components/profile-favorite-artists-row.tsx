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
import type { ProfileFavoriteSong } from '@/lib/profile/load-favorite-songs'
import Image from 'next/image'
import { ProfileFavoriteRemovableCell } from '@/components/profile-favorite-removable-cell'

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
  favoriteSongs = [],
  songsReady = false,
  albumsReady = false,
  isOwnProfile,
  showEmptyOwnerLink,
  onFavoritesChange,
  onFavoriteSongsChange,
  writeThrough = true,
}: {
  favorites: ProfileFavoriteArtist[]
  favoriteSongs?: ProfileFavoriteSong[]
  songsReady?: boolean
  albumsReady?: boolean
  isOwnProfile: boolean
  showEmptyOwnerLink?: boolean
  onFavoritesChange?: (next: ProfileFavoriteArtist[]) => void
  onFavoriteSongsChange?: (next: ProfileFavoriteSong[]) => void
  /** When false, only update local/cache callbacks (e.g. Edit profile Save). */
  writeThrough?: boolean
}) {
  const [chip, setChip] = useState<FavoritesChip>('artists')
  const [inlineSearch, setInlineSearch] = useState<ProfileFavoritesSearchKind | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const carouselRef = useRef<HTMLDivElement>(null)
  const fieldRef = useRef<HTMLDivElement>(null)
  const searchActive = inlineSearch === chip
  const search = useProfileFavoritesSearch(chip, searchActive)

  if (!isOwnProfile && favorites.length === 0 && favoriteSongs.length === 0) return null

  const chipIds = (['artists', 'songs', 'albums'] as const).filter((id) => {
    if (id === 'songs') return songsReady
    if (id === 'albums') return albumsReady
    return true
  })

  const shown = favorites.slice(0, 12)
  const shownSongs = favoriteSongs.slice(0, 12)
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
      if (!writeThrough) return
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
    [onFavoritesChange, writeThrough],
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

  const persistSongs = useCallback(
    async (next: ProfileFavoriteSong[]) => {
      onFavoriteSongsChange?.(next)
      if (!writeThrough) return
      try {
        await fetch('/api/profile/favorite-songs', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            favorites: next.map((f, index) => ({
              catalogSongId: f.id,
              position: index,
              artworkUrl: f.artworkUrl,
            })),
          }),
        })
      } catch {
        /* optimistic UI */
      }
    },
    [onFavoriteSongsChange, writeThrough],
  )

  const onSongPick = useCallback(
    async (hit: ComposeSearchHit) => {
      if (!songsReady) {
        closeSearch()
        return
      }
      if (favoriteSongs.some((f) => f.title === hit.title && f.artistName === hit.artist) || favoriteSongs.length >= 10) {
        closeSearch()
        return
      }
      const ensureRes = await fetch('/api/catalog/songs/ensure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: hit.id,
          title: hit.title,
          artist: hit.artist,
          artwork: hit.artwork,
          source: hit.source,
          margoSongId: hit.margoSongId,
        }),
      })
      if (!ensureRes.ok) {
        closeSearch()
        return
      }
      const data = (await ensureRes.json()) as {
        song?: { id: string; title: string; artistName: string; artworkUrl: string | null }
      }
      const row = data.song
      if (!row) {
        closeSearch()
        return
      }
      const next: ProfileFavoriteSong[] = [
        ...favoriteSongs,
        {
          id: row.id,
          title: row.title,
          artistName: row.artistName,
          artworkUrl: row.artworkUrl,
          onMargo: hit.source === 'margo',
          position: favoriteSongs.length,
        },
      ]
      await persistSongs(next)
      closeSearch()
    },
    [closeSearch, favoriteSongs, persistSongs, songsReady],
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
        {chipIds.map((id) => {
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
            className="margo-profile-favorites__carousel"
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
                if (a.onMargo && a.margoUsername && !isOwnProfile) {
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
                if (a.onMargo && a.margoUsername && isOwnProfile) {
                  return (
                    <ProfileFavoriteRemovableCell
                      key={a.id}
                      enabled
                      removeLabel={`Remove ${a.name} from favorites`}
                      onRemove={() => {
                        const next = favorites.filter((f) => f.id !== a.id)
                        void persistArtists(next)
                      }}
                    >
                      <Link
                        href={`/profile/${a.margoUsername}`}
                        className="margo-profile-favorite-artists__cell margo-profile-favorite-artists__cell--link"
                      >
                        {inner}
                      </Link>
                    </ProfileFavoriteRemovableCell>
                  )
                }
                const cell = (
                  <div key={a.id} className="margo-profile-favorite-artists__cell margo-profile-favorite-artists__cell--plain">
                    {inner}
                  </div>
                )
                if (!isOwnProfile) return cell
                return (
                  <ProfileFavoriteRemovableCell
                    key={a.id}
                    enabled
                    removeLabel={`Remove ${a.name} from favorites`}
                    onRemove={() => {
                      const next = favorites.filter((f) => f.id !== a.id)
                      void persistArtists(next)
                    }}
                  >
                    {inner}
                  </ProfileFavoriteRemovableCell>
                )
              })}
            {chip === 'songs' &&
              shownSongs.map((s) => {
                const inner = (
                  <>
                    <span className="margo-profile-favorite-artists__art-wrap margo-profile-favorite-songs__art-wrap">
                      {s.artworkUrl ? (
                        <Image src={s.artworkUrl} alt="" width={64} height={64} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span className="margo-profile-favorite-songs__art-empty" aria-hidden />
                      )}
                    </span>
                    <span className="margo-profile-favorite-artists__name" style={{ fontFamily: font }}>
                      {s.title}
                    </span>
                  </>
                )
                if (!isOwnProfile) {
                  return (
                    <div key={s.id} className="margo-profile-favorite-artists__cell">
                      {inner}
                    </div>
                  )
                }
                return (
                  <ProfileFavoriteRemovableCell
                    key={s.id}
                    enabled
                    removeLabel={`Remove ${s.title} from favorites`}
                    onRemove={() => {
                      const next = favoriteSongs.filter((f) => f.id !== s.id)
                      void persistSongs(next)
                    }}
                  >
                    {inner}
                  </ProfileFavoriteRemovableCell>
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
