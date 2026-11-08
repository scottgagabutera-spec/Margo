'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { UI_FONT, TYPE } from '@/lib/fonts'
import { MargoSearchInput } from '@/components/margo-search-input'
import { MARGO_SEARCH_HINT_ARTIST_PICKER } from '@/lib/margo-search-hints'
import { ArtistSearchDropdown } from '@/components/artist-search-dropdown'
import {
  peekArtistSearchCache,
  runArtistSearch,
  type ArtistSearchResult,
} from '@/lib/catalog-artist/search-client'

const font = UI_FONT

export type FavoriteArtistPick = {
  id: string
  name: string
  artworkUrl: string | null
  onMargo: boolean
}

export function FavoriteArtistsPicker({
  initial,
  onChange,
}: {
  initial: FavoriteArtistPick[]
  onChange: (next: FavoriteArtistPick[]) => void
}) {
  const [selected, setSelected] = useState<FavoriteArtistPick[]>(initial)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ArtistSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    setSelected(initial)
  }, [initial])

  const persist = useCallback(
    (next: FavoriteArtistPick[]) => {
      setSelected(next)
      onChange(next)
    },
    [onChange],
  )

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setSearching(false)
      setDropdownOpen(false)
      return
    }
    setDropdownOpen(true)
    const cached = peekArtistSearchCache(q)
    if (cached) {
      setResults(cached)
      setSearching(false)
    }
    const t = window.setTimeout(() => {
      void runArtistSearch({
        query: q,
        onLoading: setSearching,
        onResults: setResults,
      })
    }, 150)
    return () => window.clearTimeout(t)
  }, [query])

  const selectedIds = useMemo(() => new Set(selected.map((s) => s.id)), [selected])

  const addArtist = async (hit: ArtistSearchResult) => {
    if (selected.length >= 10 || selectedIds.has(hit.id)) return
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
        /* keep null artwork */
      }
    }
    persist([
      ...selected,
      {
        id: hit.id,
        name: hit.name,
        artworkUrl,
        onMargo: hit.onMargo,
      },
    ])
    setQuery('')
    setDropdownOpen(false)
  }

  const removeAt = (index: number) => {
    persist(selected.filter((_, i) => i !== index))
  }

  const reorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= selected.length || to >= selected.length) return
    const next = [...selected]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    persist(next)
  }

  return (
    <div id="favorite-artists" className="margo-favorite-artists-picker">
      <div className="margo-favorite-artists-picker__head">
        <span className="margo-favorite-artists-picker__title">Favorite artists</span>
        <span className="margo-favorite-artists-picker__count">{selected.length} of 10</span>
      </div>

      {selected.length > 0 ? (
        <>
          <div className="margo-favorite-artists-picker__selected">
            {selected.map((a, index) => (
              <div
                key={a.id}
                className="margo-favorite-artists-picker__chip"
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null) reorder(dragIndex, index)
                  setDragIndex(null)
                }}
              >
                <button
                  type="button"
                  className="margo-favorite-artists-picker__remove"
                  aria-label={`Remove ${a.name}`}
                  onClick={() => removeAt(index)}
                >
                  ×
                </button>
                {a.artworkUrl ? (
                  <img src={a.artworkUrl} alt="" className="margo-favorite-artists-picker__chip-art" loading="lazy" />
                ) : (
                  <span className="margo-favorite-artists-picker__chip-art margo-favorite-artists-picker__chip-art--empty" />
                )}
                <span className="margo-favorite-artists-picker__chip-name" style={{ fontFamily: font, fontSize: TYPE.label }}>
                  {a.name}
                </span>
              </div>
            ))}
          </div>
          <p className="margo-favorite-artists-picker__hint">Drag to reorder. The first five show on your profile.</p>
        </>
      ) : null}

      <div className="margo-favorite-artists-picker__search-field">
        <MargoSearchInput
          value={query}
          onChange={setQuery}
          hintText={MARGO_SEARCH_HINT_ARTIST_PICKER}
          ariaLabel={MARGO_SEARCH_HINT_ARTIST_PICKER}
          loading={searching}
          compact
          onFocus={() => {
            if (query.trim().length >= 2) setDropdownOpen(true)
          }}
        />
        <ArtistSearchDropdown
          open={dropdownOpen && query.trim().length >= 2}
          loading={searching}
          results={results}
          onPick={(hit) => { void addArtist(hit) }}
        />
      </div>
    </div>
  )
}
