'use client'

import { PlusIcon } from '@/components/icons'
import { UI_FONT } from '@/lib/fonts'
import { compactArtworkUrl } from '@/lib/compact-artwork-url'
import type { ArtistSearchResult } from '@/lib/catalog-artist/search-client'

export function ArtistSearchDropdown({
  open,
  loading,
  results,
  onPick,
}: {
  open: boolean
  loading: boolean
  results: ArtistSearchResult[]
  onPick: (hit: ArtistSearchResult) => void
}) {
  if (!open) return null

  return (
    <div className="margo-artist-search-dropdown" role="listbox" aria-label="Artist search results">
      {loading ? (
        <div
          className="compose-search-row compose-search-row--panel compose-search-row--loading margo-song-row"
          role="status"
          aria-live="polite"
        >
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', width: '100%' }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'var(--gold)',
                  opacity: 0.5,
                  animation: 'margo-bounce-dot 1s ease-in-out infinite',
                  animationDelay: `${i * 150}ms`,
                }}
              />
            ))}
          </div>
        </div>
      ) : null}
      {!loading && results.length === 0 ? (
        <p
          style={{
            textAlign: 'center',
            padding: '18px',
            fontFamily: UI_FONT,
            color: 'var(--text-muted)',
            fontSize: '0.82rem',
            margin: 0,
          }}
        >
          No artists found
        </p>
      ) : null}
      {!loading
        ? results.map((hit, index) => {
            const artSrc = hit.artworkUrl || hit.previewArtworkUrl
            const art = artSrc ? compactArtworkUrl(artSrc, 80) : ''
            const isLast = index === results.length - 1
            return (
              <button
                key={hit.id}
                type="button"
                role="option"
                className="compose-search-row compose-search-row--panel margo-song-row"
                onClick={() => onPick(hit)}
                style={{
                  borderBottom: isLast ? 'none' : undefined,
                }}
              >
                {art ? (
                  <img
                    src={art}
                    alt=""
                    className="compose-search-row__art margo-song-row__art"
                    style={{ borderRadius: '50%' }}
                  />
                ) : (
                  <span className="compose-search-row__art compose-search-row__art--empty margo-song-row__art margo-song-row__art--empty" />
                )}
                <div className="compose-search-row__meta margo-song-row__meta">
                  <span className="compose-search-row__title margo-song-row__title">{hit.name}</span>
                </div>
                {hit.onMargo ? (
                  <span className="margo-favorite-artists-picker__on-margo" style={{ marginRight: 4 }}>
                    On Margo
                  </span>
                ) : null}
                <span className="margo-favorite-artists-picker__add" aria-hidden>
                  <PlusIcon size={18} color="var(--bg)" />
                </span>
              </button>
            )
          })
        : null}
    </div>
  )
}
