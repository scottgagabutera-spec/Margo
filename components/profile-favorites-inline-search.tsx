'use client'

import { useEffect, useMemo, useState, type RefObject } from 'react'
import type { ComposeSearchHit } from '@/components/compose-search-dropdown'
import { CloseIcon } from '@/components/icons'
import { MargoSearchInput } from '@/components/margo-search-input'
import {
  ProfileFavoritesSearchPanel,
  type ProfileFavoritesSearchRow,
} from '@/components/profile-favorites-search-panel'
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
      setSearching(false)
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
    setDropdownOpen(true)
    if (kind === 'artists') {
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
  const dismiss = () => {
    setQuery('')
    onClose()
  }

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
        className="margo-search margo-search--profile-favorites"
      />
      <button
        type="button"
        className="margo-profile-favorites-inline-search__close"
        aria-label="Clear search and close"
        onClick={dismiss}
      >
        <CloseIcon size={14} color="var(--text-secondary)" />
      </button>
    </div>
  )
}

function artistRows(results: ArtistSearchResult[]): ProfileFavoritesSearchRow[] {
  return results.map((hit) => ({
    id: hit.id,
    title: hit.name,
    artworkUrl: hit.artworkUrl || hit.previewArtworkUrl,
    artworkRound: true,
    badge: hit.onMargo ? 'On Margo' : null,
  }))
}

function songRows(results: ComposeSearchHit[]): ProfileFavoritesSearchRow[] {
  return results.map((hit) => ({
    id: `${hit.source}-${hit.id}`,
    title: hit.title,
    subtitle: hit.artist,
    artworkUrl: hit.artwork || null,
    artworkRound: false,
    badge: hit.source === 'margo' ? 'On Margo' : null,
  }))
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
}: {
  kind: ProfileFavoritesSearchKind
  query: string
  searching: boolean
  dropdownOpen: boolean
  artistResults: ArtistSearchResult[]
  songResults: ComposeSearchHit[]
  onArtistPick: (hit: ArtistSearchResult) => void
  onSongPick: (hit: ComposeSearchHit) => void
}) {
  const q = query.trim()
  const showPanel =
    kind === 'albums' ? dropdownOpen : dropdownOpen && q.length >= 2

  const rows = useMemo(() => {
    if (kind === 'artists') return artistRows(artistResults)
    if (kind === 'songs') return songRows(songResults)
    return []
  }, [artistResults, kind, songResults])

  const emptyLabel =
    kind === 'artists' ? 'No artists found' : kind === 'songs' ? 'No songs found' : 'No results'

  if (!showPanel) return null

  return (
    <div
      className="margo-profile-favorites-inline-search__dropdown"
      style={{ maxHeight: DROPDOWN_MAX_PX }}
    >
      <ProfileFavoritesSearchPanel
        open
        loading={kind !== 'albums' && searching}
        rows={rows}
        highlightQuery={q}
        emptyLabel={emptyLabel}
        comingSoon={kind === 'albums'}
        onPick={(row) => {
          if (kind === 'artists') {
            const hit = artistResults.find((h) => h.id === row.id)
            if (hit) onArtistPick(hit)
            return
          }
          if (kind === 'songs') {
            const hit = songResults.find((h) => `${h.source}-${h.id}` === row.id)
            if (hit) onSongPick(hit)
          }
        }}
      />
    </div>
  )
}
