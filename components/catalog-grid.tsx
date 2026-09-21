'use client'

/**
 * CatalogGrid — the shared "browse everything" layout.
 *
 * Owns: compact list filter, optional sort pills, optional extra filter row,
 * optional topContent, loading skeleton, empty state, and the card grid.
 * Global search lives in the top-nav Search icon (/search). This field only
 * filters the list currently on screen (Spotify playlist / Apple Music library).
 */

import React, { useMemo, useState } from 'react'
import { MargoSearchInput } from '@/components/margo-search-input'

export interface CatalogSortOption {
  value: string
  label: string
}

interface CatalogGridProps<T> {
  items: T[]
  loading?: boolean
  getKey: (item: T) => string
  // Combined searchable text for an item (e.g. `${title} ${artist}`).
  getSearchText: (item: T) => string
  renderCard: (item: T) => React.ReactNode
  searchPlaceholder?: string
  sortOptions?: CatalogSortOption[]
  activeSort?: string
  onSortChange?: (value: string) => void
  // Extra filter UI rendered below the sort pills — e.g. vibe chips.
  extraFilters?: React.ReactNode
  // Page-specific header (artist identity on a discography). Nav Back is
  // in the fixed chrome — do not put a second Back here.
  topContent?: React.ReactNode
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
  topContent,
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
        .catalog-sort-pill { transition: all 150ms ease; }
        .catalog-sort-row { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 2px; }
        .catalog-sort-row::-webkit-scrollbar { display: none; }
      `}</style>

      <div style={{ position: 'sticky', top: 'var(--nav-height, 72px)', zIndex: 30, background: 'var(--bg)', padding: '12px 16px 12px' }}>
        <div style={{ maxWidth: '72rem', margin: '0 auto' }}>
          {topContent}

          <div style={{ marginBottom: sortOptions?.length || extraFilters ? '12px' : 0 }}>
            <MargoSearchInput
              value={search}
              onChange={setSearch}
              placeholder={searchPlaceholder}
              className="catalog-search"
            />
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
                      color: active ? 'var(--bg)' : 'var(--text-secondary)',
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
            <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
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