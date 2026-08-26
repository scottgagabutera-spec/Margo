'use client'

import Link from 'next/link'
import { ArrowLeftIcon } from '@/components/icons'

const font = 'var(--font-lora), serif'

export interface MargoConversationHeaderProps {
  displayName?: string
  username?: string
  avatarUrl?: string | null
  /** When true, pad for safe-area only (mobile thread — no global nav). */
  compactTop?: boolean
}

export function MargoConversationHeader({
  displayName,
  username,
  avatarUrl,
  compactTop = false,
}: MargoConversationHeaderProps) {
  const profileHref = username ? `/profile/${username}` : undefined
  const name = displayName ?? ''

  return (
    <div
      style={{
        flexShrink: 0,
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        paddingTop: compactTop
          ? 'max(12px, env(safe-area-inset-top, 0px))'
          : '8px',
        paddingLeft: '16px',
        paddingRight: '16px',
        paddingBottom: '12px',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr 44px',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <Link
        href="/messages"
        aria-label="Messages"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          minWidth: 'var(--margo-touch-min)',
          minHeight: 'var(--margo-touch-min)',
          marginLeft: '-8px',
          padding: '0 8px',
          textDecoration: 'none',
          color: 'var(--text-secondary)',
          boxSizing: 'border-box',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <ArrowLeftIcon size={16} color="currentColor" />
        <span
          className="margo-conversation-back-label"
          style={{
            fontFamily: font,
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '1.5px',
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
            justifyContent: 'center',
            gap: '8px',
            minWidth: 0,
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
              <span style={{ fontFamily: font, fontSize: '0.65rem', fontWeight: 700, color: 'var(--bg)' }}>
                {name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <span
            style={{
              fontFamily: font,
              fontSize: '0.85rem',
              color: 'var(--text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {name}
          </span>
        </Link>
      ) : (
        <div aria-hidden style={{ minHeight: '32px' }} />
      )}

      <div aria-hidden style={{ width: '44px' }} />
      <style>{`
        @media (min-width: 640px) {
          .margo-conversation-back-label { display: none; }
        }
      `}</style>
    </div>
  )
}
