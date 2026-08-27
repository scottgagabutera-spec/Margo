'use client'

import { UI_FONT } from '@/lib/fonts'
import { PendingNavLink } from '@/components/pending-nav-link'
import { AiGeneratedLabel } from '@/components/ai-generated-label'

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
 * Canonical song title vs artist hierarchy (D3).
 * Title: --text, semibold, larger. Artist: --text-secondary, regular, smaller.
 * AI provenance: quiet line under the title (stable regardless of artist length).
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
    const joined = [t, a].filter(Boolean).join(' · ')
    const node = (
      <span style={{
        fontFamily: UI_FONT,
        fontSize: '0.7rem',
        color: 'var(--text-muted)',
        letterSpacing: '0.2px',
        display: 'inline-flex',
        alignItems: 'baseline',
        flexWrap: 'wrap',
        minWidth: 0,
        ...style,
        ...titleStyle,
      }}>
        {joined ? <span style={{ minWidth: 0 }}>{joined}</span> : null}
        {aiGenerated ? <AiGeneratedLabel show suffix={!!joined} /> : null}
      </span>
    )
    if (href) {
      return <PendingNavLink href={href} indicator="tint" style={{ textDecoration: 'none', color: 'inherit' }}>{node}</PendingNavLink>
    }
    return node
  }

  const body = (
    <div style={{ minWidth: 0, ...style }}>
      {t ? (
        <p style={{
          margin: 0,
          fontFamily: UI_FONT,
          fontSize: '0.95rem',
          fontWeight: 600,
          color: 'var(--text)',
          lineHeight: 1.3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          ...titleStyle,
        }}>
          {t}
        </p>
      ) : null}
      {aiGenerated ? (
        <p style={{ margin: t ? '1px 0 0' : 0, lineHeight: 1.2 }}>
          <AiGeneratedLabel show />
        </p>
      ) : null}
      {a ? (
        <ArtistCreditLine
          artist={a}
          style={{
            margin: (t || aiGenerated) ? '2px 0 0' : 0,
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
