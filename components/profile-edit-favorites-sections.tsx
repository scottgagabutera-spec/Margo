'use client'

import { useCallback, useMemo, useState } from 'react'
import { UI_FONT, TYPE } from '@/lib/fonts'
import type { ComposeSearchHit } from '@/components/compose-search-dropdown'
import type { ArtistSearchResult } from '@/lib/catalog-artist/search-client'
import { CloseIcon } from '@/components/icons'
import { MargoSearchInput } from '@/components/margo-search-input'
import {
  ProfileFavoritesSearchResults,
  useProfileFavoritesSearch,
  type ProfileFavoritesSearchKind,
} from '@/components/profile-favorites-inline-search'
import type { ProfileFavoriteArtist } from '@/components/profile-favorite-artists-row'
import type { ProfileFavoriteSong } from '@/lib/profile/load-favorite-songs'

const font = UI_FONT

const SEARCH_HINT: Record<ProfileFavoritesSearchKind, string> = {
  artists: 'Search for an artist',
  songs: 'Search for a song',
  albums: 'Search for an album',
}

const ROW_SCROLL: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'nowrap',
  gap: 16,
  overflowX: 'auto',
  WebkitOverflowScrolling: 'touch',
  marginBottom: 8,
  paddingBottom: 4,
}

const SQUARE_ART: React.CSSProperties = { borderRadius: 10 }

function FavoriteChip({
  name,
  artworkUrl,
  round,
  draggable,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  name: string
  artworkUrl: string | null
  round: boolean
  draggable?: boolean
  onRemove: () => void
  onDragStart?: () => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: () => void
}) {
  return (
    <div
      className="margo-favorite-artists-picker__chip"
      style={draggable ? { cursor: 'grab' } : undefined}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <button
        type="button"
        className="margo-favorite-artists-picker__remove"
        aria-label={`Remove ${name}`}
        onClick={onRemove}
      >
        ×
      </button>
      {artworkUrl ? (
        <img
          src={artworkUrl}
          alt=""
          className="margo-favorite-artists-picker__chip-art"
          style={round ? undefined : SQUARE_ART}
          loading="lazy"
        />
      ) : (
        <span
          className="margo-favorite-artists-picker__chip-art margo-favorite-artists-picker__chip-art--empty"
          style={round ? undefined : SQUARE_ART}
        />
      )}
      <span className="margo-favorite-artists-picker__chip-name" style={{ fontFamily: font, fontSize: TYPE.label }}>
        {name}
      </span>
    </div>
  )
}

function EditFavoriteSection({
  title,
  kind,
  count,
  children,
  searchSlot,
}: {
  title: string
  kind: ProfileFavoritesSearchKind
  count: number
  children: React.ReactNode
  searchSlot: React.ReactNode
}) {
  return (
    <section className="margo-favorite-artists-picker" aria-labelledby={`edit-fav-${kind}`} style={{ marginBottom: 24 }}>
      <div className="margo-favorite-artists-picker__head">
        <span id={`edit-fav-${kind}`} className="margo-favorite-artists-picker__title">
          {title}
        </span>
        <span className="margo-favorite-artists-picker__count">{count} of 10</span>
      </div>
      <div className="margo-favorite-artists-picker__selected" style={ROW_SCROLL}>
        {children}
      </div>
      {kind === 'artists' && count > 0 ? (
        <p className="margo-favorite-artists-picker__hint">Drag to reorder. The first five show on your profile.</p>
      ) : null}
      <div className="margo-favorite-artists-picker__search-field">{searchSlot}</div>
    </section>
  )
}

function SectionSearch({
  kind,
  onArtistPick,
  onSongPick,
}: {
  kind: ProfileFavoritesSearchKind
  onArtistPick: (hit: ArtistSearchResult) => void
  onSongPick: (hit: ComposeSearchHit) => void
}) {
  const [active, setActive] = useState(false)
  const search = useProfileFavoritesSearch(kind, active)

  const close = useCallback(() => {
    search.setQuery('')
    setActive(false)
  }, [search.setQuery])

  return (
    <div
      onFocusCapture={() => setActive(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setActive(false)
      }}
    >
      <div className="margo-profile-favorites-inline-search__field">
        <MargoSearchInput
          value={search.query}
          onChange={search.setQuery}
          hintText={SEARCH_HINT[kind]}
          ariaLabel={SEARCH_HINT[kind]}
          loading={search.searching}
          compact
          className="margo-search margo-search--profile-favorites"
        />
        <button
          type="button"
          className="margo-profile-favorites-inline-search__close"
          aria-label="Clear search and close"
          onClick={close}
        >
          <CloseIcon size={14} color="var(--text-secondary)" />
        </button>
      </div>
      <ProfileFavoritesSearchResults
        kind={kind}
        query={search.query}
        searching={search.searching}
        dropdownOpen={active && (kind === 'albums' || search.dropdownOpen)}
        artistResults={search.artistResults}
        songResults={search.songResults}
        onArtistPick={(hit) => {
          onArtistPick(hit)
          close()
        }}
        onSongPick={(hit) => {
          onSongPick(hit)
          close()
        }}
      />
    </div>
  )
}

export function ProfileEditFavoritesSections({
  favoriteArtists,
  favoriteSongs,
  songsReady,
  onArtistsChange,
  onSongsChange,
}: {
  favoriteArtists: ProfileFavoriteArtist[]
  favoriteSongs: ProfileFavoriteSong[]
  songsReady: boolean
  onArtistsChange: (next: ProfileFavoriteArtist[]) => void
  onSongsChange: (next: ProfileFavoriteSong[]) => void
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const artistIds = useMemo(() => new Set(favoriteArtists.map((a) => a.id)), [favoriteArtists])
  const songKeys = useMemo(
    () => new Set(favoriteSongs.map((s) => `${s.title}\0${s.artistName}`)),
    [favoriteSongs],
  )

  const addArtist = useCallback(
    async (hit: ArtistSearchResult) => {
      if (favoriteArtists.length >= 10 || artistIds.has(hit.id)) return
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
          /* optional */
        }
      }
      onArtistsChange([
        ...favoriteArtists,
        {
          id: hit.id,
          name: hit.name,
          artworkUrl,
          fallbackArtworkUrl: hit.previewArtworkUrl,
          onMargo: hit.onMargo,
          margoUsername: hit.margoUsername,
          position: favoriteArtists.length,
        },
      ])
    },
    [artistIds, favoriteArtists, onArtistsChange],
  )

  const reorderArtists = useCallback(
    (from: number, to: number) => {
      if (from === to || from < 0 || to < 0 || from >= favoriteArtists.length || to >= favoriteArtists.length) return
      const next = [...favoriteArtists]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      onArtistsChange(next.map((a, i) => ({ ...a, position: i })))
    },
    [favoriteArtists, onArtistsChange],
  )

  const addSong = useCallback(
    async (hit: ComposeSearchHit) => {
      if (!songsReady || favoriteSongs.length >= 10) return
      if (songKeys.has(`${hit.title}\0${hit.artist}`)) return
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
      if (!ensureRes.ok) return
      const data = (await ensureRes.json()) as {
        song?: { id: string; title: string; artistName: string; artworkUrl: string | null }
      }
      const row = data.song
      if (!row) return
      onSongsChange([
        ...favoriteSongs,
        {
          id: row.id,
          title: row.title,
          artistName: row.artistName,
          artworkUrl: row.artworkUrl,
          onMargo: hit.source === 'margo',
          position: favoriteSongs.length,
        },
      ])
    },
    [favoriteSongs, onSongsChange, songKeys, songsReady],
  )

  return (
    <div>
      <EditFavoriteSection
        title="Favorite artists"
        kind="artists"
        count={favoriteArtists.length}
        searchSlot={<SectionSearch kind="artists" onArtistPick={addArtist} onSongPick={addSong} />}
      >
        {favoriteArtists.map((a, index) => (
          <FavoriteChip
            key={a.id}
            name={a.name}
            artworkUrl={a.artworkUrl || a.fallbackArtworkUrl || null}
            round
            draggable
            onRemove={() => onArtistsChange(favoriteArtists.filter((_, i) => i !== index))}
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null) reorderArtists(dragIndex, index)
              setDragIndex(null)
            }}
          />
        ))}
      </EditFavoriteSection>

      <EditFavoriteSection
        title="Favorite songs"
        kind="songs"
        count={favoriteSongs.length}
        searchSlot={<SectionSearch kind="songs" onArtistPick={addArtist} onSongPick={addSong} />}
      >
        {favoriteSongs.map((s, index) => (
          <FavoriteChip
            key={s.id}
            name={s.title}
            artworkUrl={s.artworkUrl}
            round={false}
            onRemove={() => onSongsChange(favoriteSongs.filter((_, i) => i !== index))}
          />
        ))}
      </EditFavoriteSection>

      <EditFavoriteSection
        title="Favorite albums"
        kind="albums"
        count={0}
        searchSlot={<SectionSearch kind="albums" onArtistPick={addArtist} onSongPick={addSong} />}
      >
        {null}
      </EditFavoriteSection>

      <p className="margo-favorite-artists-picker__hint" style={{ marginTop: 0 }}>
        Tap Save to apply changes.
      </p>
    </div>
  )
}
