'use client'

/**
 * CatalogGrid — the shared "browse everything" layout.
 *
 * Owns: optional sort pills, extra filter row, topContent, loading skeleton,
 * empty state, and the card grid. Search lives in the nav Search icon
 * (`/search?scope=…`) — do not add a second field here.
 */

import React from 'react'

export interface CatalogSortOption {
  value: string
  label: string
}

interface CatalogGridProps<T> {
  items: T[]
  loading?: boolean
  getKey: (item: T) => string
  renderCard: (item: T) => React.ReactNode
  sortOptions?: CatalogSortOption[]
  activeSort?: string
  onSortChange?: (value: string) => void
  extraFilters?: React.ReactNode
  topContent?: React.ReactNode
  emptyMessage?: string
  minCardWidth?: number
  skeletonCount?: number
}

export function CatalogGrid<T>({
  items,
  loading,
  getKey,
  renderCard,
  sortOptions,
  activeSort,
  onSortChange,
  extraFilters,
  topContent,
  emptyMessage = 'Nothing here yet.',
  minCardWidth = 160,
  skeletonCount = 10,
}: CatalogGridProps<T>) {
  const showToolbar = !!(topContent || sortOptions?.length || extraFilters)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingTop: 'var(--nav-height, 72px)' }}>
      <style>{`
        .catalog-sort-pill { transition: all 150ms ease; }
        .catalog-sort-row { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 2px; }
        .catalog-sort-row::-webkit-scrollbar { display: none; }
      `}</style>

      {showToolbar ? (
      <div style={{ position: 'sticky', top: 'var(--nav-height, 72px)', zIndex: 30, background: 'var(--bg)', padding: '12px 16px 12px' }}>
        <div style={{ maxWidth: '72rem', margin: '0 auto' }}>
          {topContent}

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
                      fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', fontSize: '0.58rem', fontWeight: 700,
                      letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer',
                      background: active ? 'var(--gold)' : 'var(--surface)',
                      border: `1px solid ${active ? 'var(--gold)' : 'var(--border-hi)'}`,
                      color: active ? 'var(--bg)' : 'var(--text-secondary)',
                    }}
                  >{opt.label}</button>
                )
              })}
            </div>
          )}

          {extraFilters && <div style={{ marginTop: sortOptions?.length ? '10px' : 0 }}>{extraFilters}</div>}
        </div>
      </div>
      ) : null}

      <div style={{ padding: '0 16px 40px', width: '100%', maxWidth: '72rem', margin: '0 auto', boxSizing: 'border-box' }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))`, gap: '16px', paddingTop: '8px' }}>
            {Array(skeletonCount).fill(null).map((_, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: '0.8', borderRadius: '14px',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  animation: `catalogPulse 1.4s ease-in-out ${i * 0.08}s infinite`,
                }}
              />
            ))}
            <style>{`@keyframes catalogPulse { 0%,100%{opacity:0.3} 50%{opacity:0.7} }`}</style>
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '64px 0', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-lora), serif', fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              {emptyMessage}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))`, gap: '16px', paddingTop: '8px' }}>
            {items.map(item => (
              <React.Fragment key={getKey(item)}>{renderCard(item)}</React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
