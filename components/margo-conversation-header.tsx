'use client'

import Link from 'next/link'
import { ArrowLeftIcon } from '@/components/icons'
import { UI_FONT } from '@/lib/fonts'

export interface MargoConversationHeaderProps {
  displayName?: string
  username?: string
  avatarUrl?: string | null
  /** When true, pad for safe-area only (mobile thread — no global nav). */
  compactTop?: boolean
}

/**
 * Message thread header — back to inbox + partner identity (avatar left, name beside).
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
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        paddingTop: compactTop
          ? 'max(12px, env(safe-area-inset-top, 0px))'
          : '8px',
        paddingLeft: '12px',
        paddingRight: '16px',
        paddingBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        minHeight: 'var(--margo-touch-min)',
      }}
    >
      <Link
        href="/messages"
        aria-label="Back to Messages"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          flexShrink: 0,
          minWidth: 'var(--margo-touch-min)',
          minHeight: 'var(--margo-touch-min)',
          padding: '0 6px',
          marginLeft: '-4px',
          textDecoration: 'none',
          color: 'var(--gold)',
          boxSizing: 'border-box',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <ArrowLeftIcon size={16} color="currentColor" />
        <span
          className="margo-conversation-back-label"
          style={{
            fontFamily: UI_FONT,
            fontSize: '0.72rem',
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Messages
        </span>
      </Link>

      {profileHref && name ? (
        <Link
          href={profileHref}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flex: 1,
            minWidth: 0,
            textDecoration: 'none',
            color: 'inherit',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              flexShrink: 0,
              overflow: 'hidden',
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
              <span style={{ fontFamily: UI_FONT, fontSize: '0.62rem', fontWeight: 700, color: 'var(--bg)' }}>
                {name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p
              style={{
                fontFamily: UI_FONT,
                fontSize: '0.88rem',
                fontWeight: 600,
                color: 'var(--text)',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.25,
              }}
            >
              {name}
            </p>
            {username ? (
              <p
                style={{
                  fontFamily: UI_FONT,
                  fontSize: '0.68rem',
                  color: 'var(--text-muted)',
                  margin: '2px 0 0',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: 1.2,
                }}
              >
                @{username}
              </p>
            ) : null}
          </div>
        </Link>
      ) : (
        <div style={{ flex: 1, minHeight: '34px' }} aria-hidden />
      )}

      <style>{`
        @media (min-width: 640px) {
          .margo-conversation-back-label { display: none; }
        }
      `}</style>
    </header>
  )
}
