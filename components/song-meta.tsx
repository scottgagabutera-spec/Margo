'use client'

import { UI_FONT } from '@/lib/fonts'

type SongMetaProps = {
  title?: string | null
  artist?: string | null
  /** stacked (default) = clear hierarchy; inline = ultra-dense chrome only */
  layout?: 'stacked' | 'inline'
  href?: string | null
  className?: string
  style?: React.CSSProperties
  titleStyle?: React.CSSProperties
  artistStyle?: React.CSSProperties
}

/**
 * Canonical song title vs artist hierarchy (D3).
 * Title: --text, semibold, larger. Artist: --text-secondary, regular, smaller.
 */
export function SongMeta({
  title,
  artist,
  layout = 'stacked',
  href,
  style,
  titleStyle,
  artistStyle,
}: SongMetaProps) {
  const t = (title || '').trim()
  const a = (artist || '').trim()
  if (!t && !a) return null

  if (layout === 'inline') {
    const joined = [t, a].filter(Boolean).join(' · ')
    const node = (
      <span style={{
        fontFamily: UI_FONT,
        fontSize: '0.7rem',
        color: 'var(--text-muted)',
        letterSpacing: '0.2px',
        ...style,
        ...titleStyle,
      }}>
        {joined}
      </span>
    )
    if (href) {
      return <a href={href} style={{ textDecoration: 'none', color: 'inherit' }}>{node}</a>
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
      {a ? (
        <p style={{
          margin: t ? '2px 0 0' : 0,
          fontFamily: UI_FONT,
          fontSize: '0.75rem',
          fontWeight: 400,
          color: 'var(--text-secondary)',
          lineHeight: 1.3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          ...artistStyle,
        }}>
          {a}
        </p>
      ) : null}
    </div>
  )

  if (href) {
    return (
      <a href={href} style={{ textDecoration: 'none', color: 'inherit', display: 'block', minWidth: 0 }}>
        {body}
      </a>
    )
  }
  return body
}
