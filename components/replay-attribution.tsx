'use client'
import Link from 'next/link'
import { ReplayIcon } from '@/components/icons'
import { PostCard, type PostCardProps } from '@/components/post-card'

export interface ReplayAttributionProps {
  username: string | null
  displayName?: string | null
  quoteText?: string | null
  /** Props forwarded to the wrapped PostCard (variant feed|compact). */
  cardProps: PostCardProps
}

/**
 * Thin attribution wrapper: "Replayed by @user" + optional quote note,
 * then the underlying PostCard for the original lyric.
 */
export function ReplayAttribution({
  username,
  displayName,
  quoteText,
  cardProps,
}: ReplayAttributionProps) {
  const label = username ? `@${username}` : (displayName || 'someone')

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '0 4px 8px',
      }}>
        <ReplayIcon size={14} color="var(--text-muted)" />
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
          margin: '0 4px 10px',
          fontFamily: 'var(--font-lora), serif',
          fontSize: '0.9rem',
          fontStyle: 'normal',
          color: 'var(--text-secondary)',
          lineHeight: 1.45,
        }}>
          {quoteText}
        </p>
      ) : null}
      <PostCard {...cardProps} />
    </div>
  )
}
