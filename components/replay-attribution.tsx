'use client'
import Link from 'next/link'
import { ReplayIcon } from '@/components/icons'
import { PostCard, type PostCardProps } from '@/components/post-card'
import { useState } from 'react'

export interface ReplayAttributionProps {
  username: string | null
  displayName?: string | null
  /** Replayer avatar — X-style reshare attribution (who replayed). */
  avatarUrl?: string | null
  quoteText?: string | null
  /** Props forwarded to the wrapped PostCard (prefer compact for embedded feel). */
  cardProps: PostCardProps
}

/**
 * Embedded Replay wrapper (X/LinkedIn reshare pattern):
 * small replayer avatar + "Replayed by @user", optional quote,
 * then compact original PostCard (artwork thumb included via compact).
 */
export function ReplayAttribution({
  username,
  displayName,
  avatarUrl,
  quoteText,
  cardProps,
}: ReplayAttributionProps) {
  const label = username ? `@${username}` : (displayName || 'someone')
  const [avatarBroken, setAvatarBroken] = useState(false)
  const showAvatar = !!(avatarUrl && avatarUrl.trim() && !avatarBroken)
  const initials = (displayName || username || '?').slice(0, 1).toUpperCase()

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: '18px',
      padding: '12px',
      background: 'rgba(255,255,255,0.015)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '0 2px 10px',
      }}>
        <ReplayIcon size={14} color="var(--text-muted)" />
        <div style={{
          width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
          overflow: 'hidden',
          background: showAvatar
            ? 'none'
            : 'linear-gradient(135deg, var(--gold), var(--gold-2))',
          border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {showAvatar ? (
            <img
              src={avatarUrl!}
              alt=""
              onError={() => setAvatarBroken(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{
              fontFamily: 'var(--font-lora), serif', fontSize: '0.55rem',
              fontWeight: 700, color: 'var(--bg)',
            }}>{initials}</span>
          )}
        </div>
        <p style={{
          margin: 0, fontFamily: 'var(--font-lora), serif',
          fontSize: '0.72rem', color: 'var(--text-muted)',
        }}>
          Replayed by{' '}
          {username ? (
            <Link
              href={`/profile/${username}`}
              style={{ color: 'var(--gold)', textDecoration: 'none' }}
            >
              {label}
            </Link>
          ) : (
            <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
          )}
        </p>
      </div>
      {quoteText ? (
        <p style={{
          margin: '0 2px 10px',
          fontFamily: 'var(--font-lora), serif',
          fontSize: '0.9rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.45,
        }}>
          {quoteText}
        </p>
      ) : null}
      <PostCard {...cardProps} variant={cardProps.variant || 'compact'} />
    </div>
  )
}
