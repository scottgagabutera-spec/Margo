'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { UI_FONT, TYPE } from '@/lib/fonts'

const font = UI_FONT

export type FavoriteArtistPick = {
  id: string
  name: string
  artworkUrl: string | null
  onMargo: boolean
}

type SearchHit = FavoriteArtistPick & { margoUsername?: string | null }

export function FavoriteArtistsPicker({
  initial,
  onChange,
}: {
  initial: FavoriteArtistPick[]
  onChange: (next: FavoriteArtistPick[]) => void
}) {
  const [selected, setSelected] = useState<FavoriteArtistPick[]>(initial)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

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
      return
    }
    const t = setTimeout(() => {
      setSearching(true)
      void fetch(`/api/artists/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data: { artists?: SearchHit[] }) => {
          setResults(data.artists || [])
        })
        .catch(() => setResults([]))
        .finally(() => setSearching(false))
    }, 280)
    return () => clearTimeout(t)
  }, [query])

  const selectedIds = useMemo(() => new Set(selected.map((s) => s.id)), [selected])

  const addArtist = (hit: SearchHit) => {
    if (selected.length >= 10 || selectedIds.has(hit.id)) return
    persist([
      ...selected,
      {
        id: hit.id,
        name: hit.name,
        artworkUrl: hit.artworkUrl,
        onMargo: hit.onMargo,
      },
    ])
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

      <div className="margo-favorite-artists-picker__search-wrap">
        <input
          type="search"
          className="margo-favorite-artists-picker__search"
          placeholder="Search artist"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search artist"
        />
      </div>

      {searching ? (
        <p className="margo-favorite-artists-picker__status" style={{ fontFamily: font, fontSize: TYPE.secondary }}>
          Searching…
        </p>
      ) : null}

      <ul className="margo-favorite-artists-picker__results">
        {results.map((hit) => (
          <li key={hit.id} className="margo-favorite-artists-picker__result">
            {hit.artworkUrl ? (
              <img src={hit.artworkUrl} alt="" className="margo-favorite-artists-picker__result-art" loading="lazy" />
            ) : (
              <span className="margo-favorite-artists-picker__result-art margo-favorite-artists-picker__result-art--empty" />
            )}
            <span className="margo-favorite-artists-picker__result-name" style={{ fontFamily: font, fontSize: TYPE.secondary }}>
              {hit.name}
            </span>
            {hit.onMargo ? (
              <span className="margo-favorite-artists-picker__on-margo">On Margo</span>
            ) : null}
            <button
              type="button"
              className="margo-favorite-artists-picker__add"
              aria-label={`Add ${hit.name}`}
              disabled={selected.length >= 10 || selectedIds.has(hit.id)}
              onClick={() => addArtist(hit)}
            >
              +
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
