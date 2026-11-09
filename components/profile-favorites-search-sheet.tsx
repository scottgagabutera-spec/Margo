'use client'

import { useEffect, useState } from 'react'
import { ArtistSearchDropdown } from '@/components/artist-search-dropdown'
import type { ComposeSearchHit } from '@/components/compose-search-dropdown'
import { ComposeSearchDropdown } from '@/components/compose-search-dropdown'
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

export function ProfileFavoritesSearchSheet({
  open,
  kind,
  onClose,
}: {
  open: boolean
  kind: ProfileFavoritesSearchKind
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [artistResults, setArtistResults] = useState<ArtistSearchResult[]>([])
  const [songResults, setSongResults] = useState<ComposeSearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    if (!open) {
      setQuery('')
      setArtistResults([])
      setSongResults([])
      setSearching(false)
      setDropdownOpen(false)
    }
  }, [open])

  useEffect(() => {
    if (!open || kind === 'albums') return
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
  }, [open, kind, query])

  if (!open) return null

  return (
    <div
      className="margo-profile-favorites-search-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="margo-profile-favorites-search-sheet"
        role="dialog"
        aria-label={HINT[kind]}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="margo-profile-favorites-search-sheet__field">
          <MargoSearchInput
            value={query}
            onChange={setQuery}
            hintText={HINT[kind]}
            ariaLabel={HINT[kind]}
            loading={searching}
            autoFocus
            stackAboveOverlay
          />
        </div>
        {kind === 'albums' ? (
          <p className="margo-profile-favorites-search-sheet__note">
            Album search is not available yet.
          </p>
        ) : null}
        {kind === 'artists' && query.trim().length >= 2 ? (
          <ArtistSearchDropdown
            open={dropdownOpen}
            loading={searching}
            results={artistResults}
            onPick={() => onClose()}
          />
        ) : null}
        {kind === 'songs' && query.trim().length >= 2 ? (
          <ComposeSearchDropdown
            open={dropdownOpen}
            loading={searching}
            results={songResults}
            onSelect={() => onClose()}
            onClose={onClose}
            variant="stage"
          />
        ) : null}
      </div>
    </div>
  )
}
