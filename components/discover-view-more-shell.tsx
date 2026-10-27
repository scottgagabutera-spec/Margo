'use client'

import type { ReactNode } from 'react'
import { BackButton } from '@/components/back-button'
import { UI_FONT } from '@/lib/fonts'
import type { DiscoverVmGridKind } from '@/lib/discover-view-more-layout'

export function DiscoverViewMoreShell({
  title,
  gridKind,
  vibeFilters,
  titleRowEnd,
  children,
}: {
  title: string
  gridKind: DiscoverVmGridKind
  vibeFilters?: ReactNode
  titleRowEnd?: ReactNode
  children: ReactNode
}) {
  return (
    <div
      className="discover-vm-page"
      data-discover-vm-grid={gridKind}
      style={{ minHeight: '100vh', background: 'var(--bg)', overflowX: 'hidden', maxWidth: '100vw' }}
    >
      <style>{`
        .discover-vm-page {
          --discover-vm-pad-x: 16px;
          --discover-vm-header-gap: 8px;
          box-sizing: border-box;
        }
        @media (min-width: 600px) {
          .discover-vm-page {
            --discover-vm-pad-x: 28px;
            --discover-vm-header-gap: 28px;
          }
        }
        @media (min-width: 1024px) {
          .discover-vm-page { --discover-vm-pad-x: 48px; }
        }
        @media (min-width: 1440px) {
          .discover-vm-page {
            --discover-vm-pad-x: 64px;
            --discover-vm-header-gap: 40px;
          }
        }
        .discover-vm-inner {
          width: 100%;
          max-width: 100%;
          margin: 0 auto;
          padding-left: var(--discover-vm-pad-x);
          padding-right: var(--discover-vm-pad-x);
          padding-top: calc(var(--nav-height, 72px) + var(--discover-vm-header-gap));
          padding-bottom: calc(var(--margo-page-padding-bottom, 96px) + 16px);
          box-sizing: border-box;
        }
        @media (min-width: 2560px) {
          .discover-vm-inner {
            max-width: 1500px;
            transform: scale(1.4);
            transform-origin: top center;
          }
        }
        .discover-vm-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
          min-width: 0;
        }
        .discover-vm-title-start {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          flex: 1;
        }
        .discover-vm-title {
          font-family: ${UI_FONT};
          font-size: 16px;
          font-weight: 600;
          color: var(--text);
          margin: 0;
          letter-spacing: -0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .discover-vm-sticky {
          position: sticky;
          top: var(--nav-height, 72px);
          z-index: 25;
          background: var(--bg);
          padding-bottom: 12px;
          margin-bottom: 4px;
        }
        .discover-vm-grid {
          display: grid;
          gap: 10px;
          width: 100%;
          min-width: 0;
        }
        .discover-vm-grid[data-kind="moments"] {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        @media (min-width: 600px) {
          .discover-vm-grid[data-kind="moments"] { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (min-width: 900px) {
          .discover-vm-grid[data-kind="moments"] { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        }
        @media (min-width: 1200px) {
          .discover-vm-grid[data-kind="moments"] { grid-template-columns: repeat(5, minmax(0, 1fr)); }
        }
        @media (min-width: 2560px) {
          .discover-vm-grid[data-kind="moments"] { grid-template-columns: repeat(6, minmax(0, 1fr)); }
        }
        .discover-vm-grid[data-kind="songs"] {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        @media (min-width: 600px) {
          .discover-vm-grid[data-kind="songs"] { grid-template-columns: repeat(5, minmax(0, 1fr)); }
        }
        @media (min-width: 900px) {
          .discover-vm-grid[data-kind="songs"] { grid-template-columns: repeat(6, minmax(0, 1fr)); }
        }
        @media (min-width: 1200px) {
          .discover-vm-grid[data-kind="songs"] { grid-template-columns: repeat(7, minmax(0, 1fr)); }
        }
        @media (min-width: 2560px) {
          .discover-vm-grid[data-kind="songs"] { grid-template-columns: repeat(8, minmax(0, 1fr)); }
        }
        .discover-vm-grid[data-kind="resonance"] {
          grid-template-columns: minmax(0, 1fr);
        }
        @media (min-width: 600px) {
          .discover-vm-grid[data-kind="resonance"] { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (min-width: 1000px) {
          .discover-vm-grid[data-kind="resonance"] { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        .discover-vm-grid[data-kind="artists"] {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        @media (min-width: 600px) {
          .discover-vm-grid[data-kind="artists"] { grid-template-columns: repeat(5, minmax(0, 1fr)); }
        }
        @media (min-width: 1200px) {
          .discover-vm-grid[data-kind="artists"] { grid-template-columns: repeat(8, minmax(0, 1fr)); }
        }
        .discover-vm-empty {
          font-family: var(--font-geist-sans), system-ui, sans-serif;
          font-size: 0.9rem;
          color: var(--text-secondary);
          text-align: center;
          padding: 48px 0;
          margin: 0;
        }
        .discover-vm-skeleton {
          aspect-ratio: 0.92;
          border-radius: 14px;
          background: var(--surface);
          border: 1px solid var(--border);
          animation: discoverVmPulse 1.4s ease-in-out infinite;
        }
        .discover-vm-grid[data-kind="songs"] .discover-vm-skeleton,
        .discover-vm-grid[data-kind="artists"] .discover-vm-skeleton {
          aspect-ratio: 1;
          border-radius: 12px;
        }
        @keyframes discoverVmPulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.7; }
        }
        .discover-vm-sentinel {
          width: 100%;
          height: 1px;
          grid-column: 1 / -1;
        }
      `}</style>
      <div className="discover-vm-inner">
        <div className="discover-vm-title-row">
          <div className="discover-vm-title-start">
            <BackButton fallbackHref="/discover" label={`Back to Discover`} variant="page" />
            <h1 className="discover-vm-title" data-discover-vm-title>{title}</h1>
          </div>
          {titleRowEnd ? <div style={{ flexShrink: 0 }}>{titleRowEnd}</div> : null}
        </div>
        {vibeFilters ? (
          <div className="discover-vm-sticky" data-discover-vm-sticky>
            {vibeFilters}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  )
}
