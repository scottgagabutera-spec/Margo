'use client'

import Link from 'next/link'
import { MargoPortraitAvatar, type MargoPortraitAvatarProps } from '@/components/margo-portrait-avatar'

/** Canonical people avatars — always portrait 4:5 with gold edge (not circles). */
export type MargoAvatarSize = 'xs' | 'sm' | 'md' | 'lg'

const SIZE_MAP: Record<MargoAvatarSize, MargoPortraitAvatarProps['size']> = {
  xs: 'nav',
  sm: 'tab',
  md: 'sm',
  lg: 'feed',
}

export type MargoAvatarProps = {
  size?: MargoAvatarSize
  imageUrl?: string | null
  username?: string | null
  displayName?: string | null
  href?: string | null
  className?: string
  onImageError?: () => void
  brandMark?: boolean
}

export function MargoAvatar({
  size = 'sm',
  imageUrl,
  username,
  displayName,
  href,
  className,
  onImageError,
  brandMark,
}: MargoAvatarProps) {
  const seed = username || displayName || null
  const initial = (displayName || username || '?').charAt(0).toUpperCase()
  const inner = (
    <MargoPortraitAvatar
      size={SIZE_MAP[size]}
      imageUrl={imageUrl}
      onImageError={onImageError}
      fallbackInitial={initial}
      fallbackSeed={seed}
      brandMark={brandMark}
      className={className}
      separationRingColor="var(--bg)"
    />
  )
  if (href) {
    return (
      <Link href={href} style={{ display: 'inline-flex', textDecoration: 'none', lineHeight: 0 }} aria-label={username ? `@${username}` : undefined}>
        {inner}
      </Link>
    )
  }
  return inner
}
