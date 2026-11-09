'use client'

import { PlusIcon } from '@/components/icons'
import { UI_FONT } from '@/lib/fonts'
import { compactArtworkUrl } from '@/lib/compact-artwork-url'
import { highlightSearchText } from '@/lib/search-highlight'

export type ProfileFavoritesSearchRow = {
  id: string
  title: string
  subtitle?: string
  artworkUrl?: string | null
  artworkRound?: boolean
  badge?: string | null
}

export function ProfileFavoritesSearchPanel({
  open,
  loading,
  rows,
  highlightQuery = '',
  emptyLabel = 'No results',
  comingSoon = false,
  onPick,
}: {
  open: boolean
  loading: boolean
  rows: ProfileFavoritesSearchRow[]
  highlightQuery?: string
  emptyLabel?: string
  comingSoon?: boolean
  onPick: (row: ProfileFavoritesSearchRow) => void
}) {
  if (!open) return null

  return (
    <div className="margo-artist-search-dropdown margo-profile-favorites-search-panel" role="listbox">
      {comingSoon ? (
        <p
          className="margo-profile-favorites-search-panel__soon"
          style={{
            textAlign: 'center',
            padding: '18px',
            fontFamily: UI_FONT,
            color: 'var(--text-muted)',
            fontSize: '0.82rem',
            margin: 0,
          }}
        >
          Album search coming soon
        </p>
      ) : null}
      {!comingSoon && loading ? (
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
      {!comingSoon && !loading && rows.length === 0 ? (
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
          {emptyLabel}
        </p>
      ) : null}
      {!comingSoon && !loading
        ? rows.map((row, index) => {
            const art = row.artworkUrl ? compactArtworkUrl(row.artworkUrl, 80) : ''
            const isLast = index === rows.length - 1
            return (
              <button
                key={row.id}
                type="button"
                role="option"
                className="compose-search-row compose-search-row--panel margo-song-row"
                onClick={() => onPick(row)}
                style={{ borderBottom: isLast ? 'none' : undefined }}
              >
                {art ? (
                  <img
                    src={art}
                    alt=""
                    className="compose-search-row__art margo-song-row__art"
                    style={row.artworkRound ? { borderRadius: '50%' } : undefined}
                  />
                ) : (
                  <span className="compose-search-row__art compose-search-row__art--empty margo-song-row__art margo-song-row__art--empty" />
                )}
                <div className="compose-search-row__meta margo-song-row__meta">
                  <span className="compose-search-row__title margo-song-row__title">
                    {highlightQuery ? highlightSearchText(row.title, highlightQuery) : row.title}
                  </span>
                  {row.subtitle ? (
                    <span className="compose-search-row__artist margo-song-row__artist">
                      {highlightQuery ? highlightSearchText(row.subtitle, highlightQuery) : row.subtitle}
                    </span>
                  ) : null}
                </div>
                {row.badge ? (
                  <span className="margo-favorite-artists-picker__on-margo" style={{ marginRight: 4 }}>
                    {row.badge}
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
