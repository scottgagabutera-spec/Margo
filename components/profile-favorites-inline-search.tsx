'use client'

import { useEffect, useState, type RefObject } from 'react'
import { ArtistSearchDropdown } from '@/components/artist-search-dropdown'
import type { ComposeSearchHit } from '@/components/compose-search-dropdown'
import { ComposeSearchDropdown } from '@/components/compose-search-dropdown'
import { CloseIcon } from '@/components/icons'
import { MargoSearchInput } from '@/components/margo-search-input'
import {
  peekArtistSearchCache,
  runArtistSearch,
  type ArtistSearchResult,
} from '@/lib/catalog-artist/search-client'

export type ProfileFavoritesSearchKind = 'artists' | 'songs' | 'albums'

const HINT: Record<ProfileFavoritesSearchKind, string> = {
  artists: 'Search for an artist',
  songs: 'Search for a song',
  albums: 'Search for an album',
}

const DEBOUNCE_MS = 150
const RESULT_LIMIT = 8
const DROPDOWN_MAX_PX = 176

export function useProfileFavoritesSearch(kind: ProfileFavoritesSearchKind, active: boolean) {
  const [query, setQuery] = useState('')
  const [artistResults, setArtistResults] = useState<ArtistSearchResult[]>([])
  const [songResults, setSongResults] = useState<ComposeSearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    if (!active) {
      setQuery('')
      setArtistResults([])
      setSongResults([])
      setSearching(false)
      setDropdownOpen(false)
    }
  }, [active])

  useEffect(() => {
    if (!active) return
    if (kind === 'albums') {
      setDropdownOpen(true)
      return
    }
    const q = query.trim()
    if (q.length < 2) {
      setArtistResults([])
      setSongResults([])
      setSearching(false)
      setDropdownOpen(false)
      return
    }
    if (kind === 'artists') {
      setDropdownOpen(true)
      const cached = peekArtistSearchCache(q)
      if (cached) {
        setArtistResults(cached)
        setSearching(false)
      }
      const t = window.setTimeout(() => {
        void runArtistSearch({
          query: q,
          onLoading: setSearching,
          onResults: setArtistResults,
        })
      }, DEBOUNCE_MS)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(() => {
      setSearching(true)
      void fetch(`/api/songs/search?q=${encodeURIComponent(q)}&limit=${RESULT_LIMIT}`)
        .then((r) => (r.ok ? r.json() : { hits: [] }))
        .then((data: { hits?: ComposeSearchHit[] }) => {
          setSongResults((data.hits || []).slice(0, RESULT_LIMIT))
          setDropdownOpen(true)
        })
        .catch(() => setSongResults([]))
        .finally(() => setSearching(false))
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [active, kind, query])

  return { query, setQuery, artistResults, songResults, searching, dropdownOpen }
}

export function ProfileFavoritesSearchField({
  kind,
  query,
  setQuery,
  searching,
  onClose,
  fieldRef,
}: {
  kind: ProfileFavoritesSearchKind
  query: string
  setQuery: (v: string) => void
  searching: boolean
  onClose: () => void
  fieldRef?: RefObject<HTMLDivElement | null>
}) {
  return (
    <div ref={fieldRef} className="margo-profile-favorites-inline-search__field">
      <MargoSearchInput
        value={query}
        onChange={setQuery}
        hintText={HINT[kind]}
        ariaLabel={HINT[kind]}
        loading={searching}
        autoFocus
        compact
      />
      <button
        type="button"
        className="margo-profile-favorites-inline-search__close"
        aria-label="Close search"
        onClick={onClose}
      >
        <CloseIcon size={14} color="var(--text-secondary)" />
      </button>
    </div>
  )
}

export function ProfileFavoritesSearchResults({
  kind,
  query,
  searching,
  dropdownOpen,
  artistResults,
  songResults,
  onArtistPick,
  onSongPick,
  onClose,
}: {
  kind: ProfileFavoritesSearchKind
  query: string
  searching: boolean
  dropdownOpen: boolean
  artistResults: ArtistSearchResult[]
  songResults: ComposeSearchHit[]
  onArtistPick: (hit: ArtistSearchResult) => void
  onSongPick: (hit: ComposeSearchHit) => void
  onClose: () => void
}) {
  if (kind === 'albums' && dropdownOpen) {
    return (
      <p className="margo-profile-favorites-inline-search__album-note">
        Album search coming soon
      </p>
    )
  }
  if (kind === 'artists' && dropdownOpen && query.trim().length >= 2) {
    return (
      <div
        className="margo-profile-favorites-inline-search__dropdown"
        style={{ maxHeight: DROPDOWN_MAX_PX }}
      >
        <ArtistSearchDropdown
          open
          loading={searching}
          results={artistResults}
          onPick={onArtistPick}
        />
      </div>
    )
  }
  if (kind === 'songs' && dropdownOpen && query.trim().length >= 2) {
    return (
      <div
        className="margo-profile-favorites-inline-search__dropdown"
        style={{ maxHeight: DROPDOWN_MAX_PX }}
      >
        <ComposeSearchDropdown
          open
          loading={searching}
          results={songResults}
          highlightQuery={query}
          onSelect={onSongPick}
          onClose={onClose}
          variant="compose"
          listMaxHeightPx={DROPDOWN_MAX_PX}
        />
      </div>
    )
  }
  return null
}
