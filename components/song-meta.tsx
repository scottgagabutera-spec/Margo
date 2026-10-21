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

function titleWithAiSuffix(title: string, aiGenerated: boolean): string {
  if (!aiGenerated) return title
  return `${title} [AI]`
}

/**
 * Song title + optional [AI] suffix ellipsize as one unit; artist on the next line.
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

  const titleLine = t ? titleWithAiSuffix(t, aiGenerated) : (aiGenerated ? '[AI]' : '')

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
        {titleLine}{a ? ` · ${a}` : ''}
      </span>
    )
    if (href) {
      return <PendingNavLink href={href} indicator="tint" style={{ textDecoration: 'none', color: 'inherit' }}>{node}</PendingNavLink>
    }
    return node
  }

  const body = (
    <div style={{ minWidth: 0, ...style }}>
      {titleLine ? (
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
          title={titleLine}
        >
          {titleLine}
        </p>
      ) : null}
      {a ? (
        <ArtistCreditLine
          artist={a}
          style={{
            margin: titleLine ? '2px 0 0' : 0,
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
