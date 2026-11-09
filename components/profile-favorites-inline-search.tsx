'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
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

export function ProfileFavoritesInlineSearch({
  kind,
  onClose,
  boundaryRef,
}: {
  kind: ProfileFavoritesSearchKind
  onClose: () => void
  boundaryRef: RefObject<HTMLElement | null>
}) {
  const [query, setQuery] = useState('')
  const [artistResults, setArtistResults] = useState<ArtistSearchResult[]>([])
  const [songResults, setSongResults] = useState<ComposeSearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null
      const boundary = boundaryRef.current
      const root = rootRef.current
      if (!boundary || !root) return
      if (boundary.contains(target) || root.contains(target)) return
      onClose()
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
    }
  }, [onClose, boundaryRef])

  useEffect(() => {
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
  }, [kind, query])

  return (
    <div ref={rootRef} className="margo-profile-favorites-inline-search">
      <div className="margo-profile-favorites-inline-search__row">
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
      {kind === 'albums' && dropdownOpen ? (
        <p className="margo-profile-favorites-inline-search__album-note">
          Album search coming soon
        </p>
      ) : null}
      {kind === 'artists' && dropdownOpen && query.trim().length >= 2 ? (
        <div className="margo-profile-favorites-inline-search__dropdown">
          <ArtistSearchDropdown
            open
            loading={searching}
            results={artistResults}
            onPick={() => onClose()}
          />
        </div>
      ) : null}
      {kind === 'songs' && dropdownOpen && query.trim().length >= 2 ? (
        <div className="margo-profile-favorites-inline-search__dropdown">
          <ComposeSearchDropdown
            open
            loading={searching}
            results={songResults}
            onSelect={() => onClose()}
            onClose={onClose}
            variant="compose"
            listMaxHeightPx={200}
          />
        </div>
      ) : null}
    </div>
  )
}
