'use client'
import type { CSSProperties, ReactNode } from 'react'
import { useAuthorProfile } from '@/hooks/useAuthorProfile'
import { ArtistBadge } from '@/components/artist-badge'
import { PendingNavLink } from '@/components/pending-nav-link'
import { UI_FONT } from '@/lib/fonts'

export interface AuthorMetaProps {
  authorUid?: string | null
  fallbackName?: string | null
  /** When false, handle is not a link (e.g. card already wrapped in Link). Default true. */
  linkProfile?: boolean
  /** default = Feed header; compact = Resonance / dense rows */
  size?: 'default' | 'compact'
  /** Prefix before the handle, e.g. "by " on Lyric Back parent */
  handlePrefix?: string
  /**
   * Renders after @handle on the same row (e.g. RelativeTime).
   * Used when the parent owns a unified profile Link.
   */
  metaAfterHandle?: ReactNode
  /** stacked = name on first line, @handle · meta on second (PostCard). */
  layout?: 'inline' | 'stacked'
  /** Feed post portrait header — FEED_TYPE tokens, tight name/handle stack. */
  feedCardHeader?: boolean
}

/**
 * Shared author identity: display name + @handle (+ artist badge).
 * Use on Feed, Discover Resonance, Lyric Back — one size/color system.
 */
export function AuthorMeta({
  authorUid,
  fallbackName,
  linkProfile = true,
  size = 'default',
  handlePrefix = '',
  metaAfterHandle,
  layout = 'inline',
  feedCardHeader = false,
}: AuthorMetaProps) {
  const profile = useAuthorProfile(authorUid)

  const displayName = profile?.displayName || fallbackName || 'Margo Listener'
  const username = profile?.username

  const nameSize = size === 'compact' ? '0.75rem' : '0.82rem'
  const handleSize = size === 'compact' ? '0.6rem' : '0.7rem'

  const handleStyle: CSSProperties = {
    fontFamily: UI_FONT,
    fontSize: handleSize,
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: size === 'compact' || layout === 'stacked' ? undefined : 'var(--margo-touch-min)',
    padding: size === 'compact' || layout === 'stacked' ? '0' : '0 6px',
    boxSizing: 'border-box',
    transition: 'color 150ms ease',
  }

  const handleLabel = `${handlePrefix}${username ? '@' + username : ''}`

  const nameRow = (
    <span
      className={feedCardHeader ? 'margo-post-card__header-name-row' : undefined}
      data-testid={feedCardHeader ? 'feed-header-name-line' : undefined}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', minWidth: 0 }}
    >
      <span
        style={{
          fontFamily: UI_FONT,
          fontSize: nameSize,
          fontWeight: 600,
          color: 'var(--text)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {displayName}
      </span>
      {feedCardHeader ? (
        // Future: 18px round role badge (Artist / Producer / Label) — empty slot adds no width today.
        <span className="margo-feed-author-role-slot" data-testid="feed-author-role-slot" aria-hidden />
      ) : null}
      {!feedCardHeader && profile ? (
        <ArtistBadge
          isArtist={profile.isArtist}
          artistStatus={profile.artistStatus}
          size={size === 'compact' ? 11 : 13}
          presentation="seal"
        />
      ) : null}
    </span>
  )

  const handleNode = username ? (
    linkProfile ? (
      <PendingNavLink
        href={`/profile/${username}`}
        indicator="tint"
        style={handleStyle}
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--gold)' }}
        onMouseLeave={(e) => { if (!e.currentTarget.getAttribute('aria-busy')) e.currentTarget.style.color = 'var(--text-secondary)' }}
      >
        {handleLabel}
      </PendingNavLink>
    ) : (
      <span style={handleStyle}>{handleLabel}</span>
    )
  ) : null

  const handleRow = (username || metaAfterHandle) ? (
    <span
      className={feedCardHeader ? 'margo-feed-header-handle-row' : undefined}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', minWidth: 0 }}
    >
      {handleNode}
      {metaAfterHandle}
    </span>
  ) : null

  if (layout === 'stacked') {
    return (
      <span
        className={feedCardHeader ? 'margo-feed-header-identity-stack' : undefined}
        style={
          feedCardHeader
            ? undefined
            : { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }
        }
      >
        {nameRow}
        {handleRow}
        {feedCardHeader ? (
          <span className="margo-feed-role-third-slot" data-testid="feed-role-third-slot">
            {profile && (
              <ArtistBadge
                isArtist={profile.isArtist}
                artistStatus={profile.artistStatus}
                presentation="line"
              />
            )}
          </span>
        ) : null}
      </span>
    )
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', flexWrap: 'wrap', minWidth: 0 }}>
      {nameRow}
      {handleRow}
    </span>
  )
}

/** @deprecated Prefer AuthorMeta — kept as thin alias for existing Feed imports. */
export function UsernameTag(props: AuthorMetaProps) {
  return <AuthorMeta {...props} />
}
