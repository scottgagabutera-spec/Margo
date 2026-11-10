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
          fontSize: '0.8125rem',
          fontWeight: 500,
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
          className="margo-btn margo-btn--secondary"
          style={{
            fontFamily: UI_FONT,
            flexShrink: 0,
            whiteSpace: 'nowrap',
            gap: '2px',
            paddingLeft: '10px',
            paddingRight: '10px',
          }}
        >
          More <ChevronRightIcon size={12} color="currentColor" />
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
      className="margo-btn margo-btn--secondary"
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: UI_FONT,
        opacity: disabled ? 0.45 : 1,
        flexShrink: 0,
        cursor: disabled ? 'default' : 'pointer',
        gap: '4px',
        paddingLeft: '10px',
        paddingRight: '10px',
      }}
    >
      <PlayPauseIcon playing={false} size={8} color="var(--text-secondary)" />
      Play all
    </button>
  )
}
