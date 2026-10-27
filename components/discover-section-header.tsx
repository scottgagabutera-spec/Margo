'use client'

import Link from 'next/link'
import { ChevronRightIcon } from '@/components/icons'
import { UI_FONT } from '@/lib/fonts'

export function DiscoverSectionHeader({
  title,
  viewMoreHref,
}: {
  title: string
  viewMoreHref: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px',
        gap: '12px',
        minWidth: 0,
      }}
    >
      <h2
        data-discover-section-title
        style={{
          fontFamily: UI_FONT,
          fontSize: '16px',
          fontWeight: 600,
          color: 'var(--text)',
          margin: 0,
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h2>
      <Link
        href={viewMoreHref}
        data-discover-more-link
        style={{
          fontFamily: UI_FONT,
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--gold)',
          textDecoration: 'none',
          flexShrink: 0,
          whiteSpace: 'nowrap',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '2px',
          minHeight: '44px',
          padding: '0 4px',
          boxSizing: 'border-box',
        }}
      >
        More <ChevronRightIcon size={12} color="var(--gold)" />
      </Link>
    </div>
  )
}
