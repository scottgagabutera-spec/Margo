'use client'

import Link from 'next/link'
import { ArrowLeftIcon } from '@/components/icons'
import { TYPE, UI_FONT } from '@/lib/fonts'

export interface MargoConversationHeaderProps {
  displayName?: string
  username?: string
  avatarUrl?: string | null
  /** When true, pad for safe-area only (mobile thread — no global nav). */
  compactTop?: boolean
}

const touch = 'var(--margo-touch-min)'

/**
 * Message thread header — icon-only back (matches BackButton chrome) + centered partner identity.
 */
export function MargoConversationHeader({
  displayName,
  username,
  avatarUrl,
  compactTop = false,
}: MargoConversationHeaderProps) {
  const profileHref = username ? `/profile/${username}` : undefined
  const name = displayName?.trim() || username || ''

  return (
    <header
      style={{
        flexShrink: 0,
        position: 'relative',
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        paddingTop: compactTop
          ? 'max(8px, env(safe-area-inset-top, 0px))'
          : '8px',
        paddingLeft: '8px',
        paddingRight: '8px',
        paddingBottom: '10px',
        display: 'grid',
        gridTemplateColumns: `${touch} 1fr ${touch}`,
        alignItems: 'center',
        minHeight: touch,
      }}
    >
      <Link
        href="/messages"
        aria-label="Back to Messages"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: touch,
          height: touch,
          textDecoration: 'none',
          color: 'var(--gold)',
          boxSizing: 'border-box',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <ArrowLeftIcon size={20} color="currentColor" />
      </Link>

      {profileHref && name ? (
        <Link
          href={profileHref}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 0,
            padding: '0 4px',
            textDecoration: 'none',
            color: 'inherit',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              flexShrink: 0,
              overflow: 'hidden',
              marginBottom: '4px',
              background: avatarUrl ? 'none' : 'linear-gradient(135deg, var(--gold), var(--gold-2))',
              border: '1px solid var(--gold-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontFamily: UI_FONT, fontSize: TYPE.label, fontWeight: 700, color: 'var(--bg)' }}>
                {name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <p
            style={{
              fontFamily: UI_FONT,
              fontSize: TYPE.secondary,
              fontWeight: 600,
              color: 'var(--text)',
              margin: 0,
              maxWidth: '100%',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.2,
              textAlign: 'center',
            }}
          >
            {name}
          </p>
          {username ? (
            <p
              style={{
                fontFamily: UI_FONT,
                fontSize: TYPE.meta,
                color: 'var(--text-muted)',
                margin: '2px 0 0',
                maxWidth: '100%',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.2,
                textAlign: 'center',
              }}
            >
              @{username}
            </p>
          ) : null}
        </Link>
      ) : (
        <div aria-hidden />
      )}

      <div aria-hidden style={{ width: touch, height: touch }} />
    </header>
  )
}
