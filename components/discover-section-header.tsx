'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronRightIcon } from '@/components/icons'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { UI_FONT } from '@/lib/fonts'

export function DiscoverSectionHeader({
  title,
  viewMoreHref,
  trailing,
}: {
  title: string
  viewMoreHref: string
  /** Sits left of the More link (e.g. Play all on Moments). Gap to More is 14px. */
  trailing?: ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px',
        gap: '8px',
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
          minWidth: 0,
          flex: '1 1 auto',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {title}
      </h2>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          flexShrink: 0,
          minWidth: 0,
        }}
      >
        {trailing}
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
    </div>
  )
}

export function DiscoverPlayAllButton({
  disabled,
  onClick,
}: {
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      data-discover-play-all
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: UI_FONT,
        fontSize: '9px',
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        padding: '4px 9px',
        minHeight: '44px',
        borderRadius: '8px',
        border: '1px solid var(--gold)',
        background: 'transparent',
        color: 'var(--gold)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        flexShrink: 0,
        boxSizing: 'border-box',
        lineHeight: 1.2,
      }}
    >
      <PlayPauseIcon playing={false} size={8} color="var(--gold)" />
      Play all
    </button>
  )
}
