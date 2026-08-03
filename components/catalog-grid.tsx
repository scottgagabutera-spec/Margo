'use client'

/**
 * CatalogGrid — the shared "browse everything" layout.
 *
 * Owns: sticky search bar, optional sort pills, optional extra filter row
 * (e.g. vibe chips), loading skeleton, empty state, and the responsive
 * card grid itself.
 *
 * Does NOT own: what the cards look like, or how items are sorted/fetched
 * — that's the page's job. This keeps Songs and Artists from having to
 * rebuild the same frame twice, while staying free to render completely
 * different card designs inside it.
 */

import React, { useMemo, useState } from 'react'
import { CloseIcon } from '@/components/icons'

export interface CatalogSortOption {
  value: string
  label: string
}

interface CatalogGridProps<T> {
  items: T[]
  loading?: boolean
  getKey: (item: T) => string
  // Combined searchable text for an item (e.g. `${title} ${artist}`).
  // CatalogGrid does the actual filtering so pages don't each reimplement it.
  getSearchText: (item: T) => string
  renderCard: (item: T) => React.ReactNode
  searchPlaceholder?: string
  sortOptions?: CatalogSortOption[]
  activeSort?: string
  onSortChange?: (value: string) => void
  // Extra filter UI rendered below the sort pills — e.g. vibe chips.
  extraFilters?: React.ReactNode
  emptyMessage?: string
  // Grid column minimum width in px — 160 fits Song-style square cards,
  // Artists pages typically want something smaller (e.g. 110).
  minCardWidth?: number
  skeletonCount?: number
}

export function CatalogGrid<T>({
  items,
  loading,
  getKey,
  getSearchText,
  renderCard,
  searchPlaceholder = 'Search…',
  sortOptions,
  activeSort,
  onSortChange,
  extraFilters,
  emptyMessage = 'Nothing here yet.',
  minCardWidth = 160,
  skeletonCount = 10,
}: CatalogGridProps<T>) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter(item => getSearchText(item).toLowerCase().includes(q))
  }, [items, search, getSearchText])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingTop: 'var(--nav-height, 72px)' }}>
      <style>{`
        .catalog-search:focus { border-color: rgba(232,197,71,0.4) !important; outline: none; }
        .catalog-sort-pill { transition: all 150ms ease; }
        .catalog-sort-row { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 2px; }
        .catalog-sort-row::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Sticky search + sort — same top offset pattern used on Discover,
          so this page doesn't drift under the fixed nav on load. */}
      <div style={{ position: 'sticky', top: 'var(--nav-height, 72px)', zIndex: 30, background: 'var(--bg)', padding: 'clamp(20px, 5vw, 40px) 16px 16px' }}>
        <div style={{ maxWidth: '72rem', margin: '0 auto' }}>
          <div style={{ position: 'relative', marginBottom: sortOptions?.length || extraFilters ? '14px' : 0 }}>
            <input
              className="catalog-search"
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              style={{
                width: '100%', height: '44px', padding: '0 40px 0 16px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '50px', color: 'var(--text)', fontFamily: 'var(--font-lora), serif',
                fontSize: '0.82rem', boxSizing: 'border-box', transition: 'border-color 200ms ease',
              }}
            />
            {search && (
              <button
                aria-label="Clear search"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
                  width: '38px', height: '38px', borderRadius: '50%', background: 'none', border: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              ><CloseIcon size={14} color="var(--text-3)" /></button>
            )}
          </div>

          {sortOptions && sortOptions.length > 0 && (
            <div className="catalog-sort-row">
              {sortOptions.map(opt => {
                const active = activeSort === opt.value
                return (
                  <button
                    key={opt.value}
                    className="catalog-sort-pill"
                    onClick={() => onSortChange?.(opt.value)}
                    style={{
                      flexShrink: 0, padding: '6px 14px', borderRadius: '50px',
                      fontFamily: 'var(--font-lora), serif', fontSize: '0.58rem', fontWeight: 700,
                      letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer',
                      background: active ? 'var(--gold)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? 'var(--gold)' : 'rgba(255,255,255,0.1)'}`,
                      color: active ? 'var(--bg)' : 'var(--text-3)',
                    }}
                  >{opt.label}</button>
                )
              })}
            </div>
          )}

          {extraFilters && <div style={{ marginTop: '10px' }}>{extraFilters}</div>}
        </div>
      </div>

      <div style={{ padding: '0 16px 40px', width: '100%', maxWidth: '72rem', margin: '0 auto', boxSizing: 'border-box' }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))`, gap: '16px', paddingTop: '8px' }}>
            {Array(skeletonCount).fill(null).map((_, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: '0.8', borderRadius: '14px',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                  animation: `catalogPulse 1.4s ease-in-out ${i * 0.08}s infinite`,
                }}
              />
            ))}
            <style>{`@keyframes catalogPulse { 0%,100%{opacity:0.3} 50%{opacity:0.7} }`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '64px 0', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--text-3)', fontSize: '0.95rem' }}>
              {search ? `Nothing found for “${search}”` : emptyMessage}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))`, gap: '16px', paddingTop: '8px' }}>
            {filtered.map(item => (
              <React.Fragment key={getKey(item)}>{renderCard(item)}</React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}