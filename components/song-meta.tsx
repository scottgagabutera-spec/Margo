'use client'

import { UI_FONT } from '@/lib/fonts'
import { PendingNavLink } from '@/components/pending-nav-link'

type SongMetaProps = {
  title?: string | null
  artist?: string | null
  aiGenerated?: boolean
  /** stacked (default) = clear hierarchy; inline = ultra-dense chrome only */
  layout?: 'stacked' | 'inline'
  href?: string | null
  className?: string
  style?: React.CSSProperties
  titleStyle?: React.CSSProperties
  artistStyle?: React.CSSProperties
}

function ArtistCreditLine({
  artist,
  style,
}: {
  artist: string
  style?: React.CSSProperties
}) {
  return (
    <p style={{
      margin: 0,
      fontFamily: UI_FONT,
      fontSize: '0.75rem',
      fontWeight: 400,
      color: 'var(--text-secondary)',
      lineHeight: 1.3,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      minWidth: 0,
      ...style,
    }}>
      {artist}
    </p>
  )
}

/**
 * Song title ellipsizes; optional muted AI chip (does not compete with title).
 */
export function SongMeta({
  title,
  artist,
  aiGenerated = false,
  layout = 'stacked',
  href,
  style,
  titleStyle,
  artistStyle,
}: SongMetaProps) {
  const t = (title || '').trim()
  const a = (artist || '').trim()
  if (!t && !a && !aiGenerated) return null

  if (layout === 'inline') {
    const node = (
      <span style={{
        fontFamily: UI_FONT,
        fontSize: '0.7rem',
        color: 'var(--text-muted)',
        letterSpacing: '0.2px',
        display: 'block',
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        ...style,
        ...titleStyle,
      }}>
        {t}{aiGenerated ? (
          <span className="margo-feed-ai-tag margo-feed-ai-tag--inline" aria-label="AI generated">AI</span>
        ) : null}{a ? ` · ${a}` : ''}
      </span>
    )
    if (href) {
      return <PendingNavLink href={href} indicator="tint" style={{ textDecoration: 'none', color: 'inherit' }}>{node}</PendingNavLink>
    }
    return node
  }

  const body = (
    <div style={{ minWidth: 0, ...style }}>
      {t || aiGenerated ? (
        <p
          className="margo-song-meta__title-line"
          style={{
            margin: 0,
            fontFamily: UI_FONT,
            fontSize: '0.95rem',
            fontWeight: 600,
            color: 'var(--text)',
            lineHeight: 1.3,
            minWidth: 0,
            ...titleStyle,
          }}
          title={t || undefined}
        >
          {t ? (
            <span className="margo-song-meta__title-text">{t}</span>
          ) : null}
          {aiGenerated ? (
            <span className="margo-feed-ai-tag" aria-label="AI generated">AI</span>
          ) : null}
        </p>
      ) : null}
      {a ? (
        <ArtistCreditLine
          artist={a}
          style={{
            margin: t || aiGenerated ? '2px 0 0' : 0,
            ...artistStyle,
          }}
        />
      ) : null}
    </div>
  )

  if (href) {
    return (
      <PendingNavLink href={href} indicator="tint" style={{ textDecoration: 'none', color: 'inherit', display: 'block', minWidth: 0 }}>
        {body}
      </PendingNavLink>
    )
  }
  return body
}
