'use client'

import type { CSSProperties, ReactNode } from 'react'
import { MargoSymbol } from '@/components/margo-symbol'
import { UI_FONT } from '@/lib/fonts'

export type MargoPortraitAvatarSize = 'feed' | 'sm'

const SIZE_PX: Record<MargoPortraitAvatarSize, { w: number; h: number; r: number }> = {
  feed: { w: 52, h: 66, r: 10 },
  sm: { w: 40, h: 50, r: 8 },
}

export interface MargoPortraitAvatarProps {
  size?: MargoPortraitAvatarSize
  imageUrl?: string | null
  onImageError?: () => void
  /** Single-letter or short fallback when no photo. */
  fallbackInitial?: string
  /** Yellow tile + M mark (official account). */
  brandMark?: boolean
  /** Gold tile + dark initial (Tier1 catalog moment, no photo). */
  tierGoldTile?: boolean
  /** Ring behind the frame — usually matches the card surface. */
  separationRingColor?: string
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

/**
 * Portrait 4:5 author photo — gold edge, slight Y tilt, separation ring.
 * Shared by feed post header; profile can reuse via `size` later.
 */
export function MargoPortraitAvatar({
  size = 'feed',
  imageUrl,
  onImageError,
  fallbackInitial = '?',
  brandMark = false,
  tierGoldTile = false,
  separationRingColor = 'var(--surface)',
  className,
  style,
  children,
}: MargoPortraitAvatarProps) {
  const dim = SIZE_PX[size]
  const hasPhoto = !!imageUrl?.trim()

  const tileBg = brandMark || tierGoldTile
    ? 'var(--gold)'
    : 'linear-gradient(135deg, rgba(232,197,71,0.28), rgba(232,197,71,0.08))'

  const inner = children ?? (
    hasPhoto ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl!}
        alt=""
        onError={onImageError}
        className="margo-portrait-avatar__photo"
      />
    ) : brandMark ? (
      <MargoSymbol size={Math.round(dim.w * 0.42)} variant="ink" />
    ) : (
      <span
        className="margo-portrait-avatar__initial"
        style={{
          fontFamily: UI_FONT,
          fontWeight: 700,
          fontSize: size === 'feed' ? '1.125rem' : '0.875rem',
          color: tierGoldTile ? 'var(--bg)' : 'var(--gold)',
        }}
      >
        {fallbackInitial}
      </span>
    )
  )

  return (
    <span
      className={['margo-portrait-avatar', className].filter(Boolean).join(' ')}
      style={{
        ['--mpa-w' as string]: `${dim.w}px`,
        ['--mpa-h' as string]: `${dim.h}px`,
        ['--mpa-r' as string]: `${dim.r}px`,
        ['--mpa-sep' as string]: separationRingColor,
        ...style,
      }}
      aria-hidden={hasPhoto ? undefined : true}
    >
      <span className="margo-portrait-avatar__sep" />
      <span className="margo-portrait-avatar__frame" style={{ background: hasPhoto ? 'var(--surface-2)' : tileBg }}>
        {inner}
      </span>
    </span>
  )
}

export function feedPortraitDimensions(size: MargoPortraitAvatarSize = 'feed') {
  return SIZE_PX[size]
}
