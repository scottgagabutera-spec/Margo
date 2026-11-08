'use client'

import type { ComposeSearchHit } from '@/components/compose-search-dropdown'
import { CheckIcon, PlusIcon } from '@/components/icons'
import { compactArtworkUrl } from '@/lib/compact-artwork-url'
import { UI_FONT } from '@/lib/fonts'

const font = UI_FONT

export function EchoesSongSearchPanel({
  open,
  loading,
  error,
  hits,
  query,
  selectedKeys,
  onPick,
}: {
  open: boolean
  loading: boolean
  error: string | null
  hits: ComposeSearchHit[]
  query: string
  selectedKeys: Set<string>
  onPick: (hit: ComposeSearchHit) => void
}) {
  if (!open) return null

  if (loading) {
    return (
      <p className="margo-echoes-search-panel__state" style={{ fontFamily: font }} role="status">
        Searching
      </p>
    )
  }
  if (error) {
    return (
      <p className="margo-echoes-search-panel__state margo-echoes-search-panel__state--error" style={{ fontFamily: font }} role="alert">
        {error}
      </p>
    )
  }
  if (hits.length === 0) {
    return (
      <p className="margo-echoes-search-panel__state" style={{ fontFamily: font }}>
        No songs for {query}
      </p>
    )
  }

  return (
    <ul className="margo-echoes-search-panel__list" aria-label="Song search results">
      {hits.map((hit) => {
        const key = `${hit.title}\0${hit.artist}`
        const selected = selectedKeys.has(key)
        const thumb = hit.artwork ? compactArtworkUrl(hit.artwork, 96) : ''
        return (
          <li key={`${hit.source}-${hit.id}-${hit.title}`} className="margo-echoes-search-panel__row margo-pressable-surface">
            <button type="button" className="margo-echoes-search-panel__pick" onClick={() => onPick(hit)}>
              {thumb ? (
                <img src={thumb} alt="" width={44} height={44} className="margo-echoes-search-panel__art" />
              ) : (
                <span className="margo-echoes-search-panel__art margo-echoes-search-panel__art--empty" aria-hidden />
              )}
              <span className="margo-echoes-search-panel__meta">
                <span className="margo-echoes-search-panel__title" style={{ fontFamily: font }}>
                  {hit.title}
                </span>
                <span className="margo-echoes-search-panel__artist" style={{ fontFamily: font }}>
                  {hit.artist}
                </span>
                <span className="margo-echoes-search-panel__source" style={{ fontFamily: font }}>
                  {hit.source === 'margo' ? 'Margo' : hit.source === 'apple' ? 'Apple Music' : 'Genius'}
                </span>
              </span>
              <span className={selected ? 'margo-feed-memory-card__action' : 'margo-echoes-answer__outline-btn'} aria-hidden>
                {selected ? <CheckIcon size={16} color="var(--bg)" /> : <PlusIcon size={16} color="var(--gold)" />}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
