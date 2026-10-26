'use client'

import type { CSSProperties, ReactNode } from 'react'
import { MargoPortraitBrandMark } from '@/components/margo-portrait-brand-mark'
import { UI_FONT } from '@/lib/fonts'
import { portraitFallbackFromSeed } from '@/lib/portrait-fallback'

export type MargoPortraitAvatarSize =
  | 'feed'
  | 'sm'
  | 'tab'
  | 'profile'
  | 'row'
  | 'hub'
  | 'chatHeader'
  | 'nav'

const SIZE_PX: Record<MargoPortraitAvatarSize, { w: number; h: number; r: number; square?: boolean }> = {
  feed: { w: 52, h: 66, r: 10 },
  sm: { w: 40, h: 50, r: 8 },
  tab: { w: 32, h: 40, r: 7 },
  profile: { w: 96, h: 120, r: 18 },
  row: { w: 44, h: 44, r: 12, square: true },
  hub: { w: 48, h: 48, r: 13, square: true },
  chatHeader: { w: 34, h: 34, r: 10, square: true },
  nav: { w: 22, h: 22, r: 6, square: true },
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
  /** Username/id seed for a deterministic gradient initial (no external avatar). */
  fallbackSeed?: string | null
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
  fallbackSeed = null,
  separationRingColor = 'var(--surface)',
  className,
  style,
  children,
}: MargoPortraitAvatarProps) {
  const dim = SIZE_PX[size]
  const square = !!dim.square
  const hasPhoto = !!imageUrl?.trim()
  const seededFallback = !hasPhoto && !brandMark && !tierGoldTile && fallbackSeed
    ? portraitFallbackFromSeed(fallbackSeed, fallbackInitial)
    : null

  const tileBg = brandMark
    ? 'var(--surface-2)'
    : tierGoldTile
      ? 'var(--gold)'
      : seededFallback?.background
        ?? 'linear-gradient(135deg, rgba(232,197,71,0.28), rgba(232,197,71,0.08))'
  const initialChar = seededFallback?.initial ?? fallbackInitial
  const initialColor = tierGoldTile ? 'var(--bg)' : (seededFallback?.color ?? 'var(--gold)')

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
      <span className="margo-portrait-avatar__brand-inset">
        <MargoPortraitBrandMark className="margo-portrait-avatar__brand-mark" />
      </span>
    ) : (
      <span
        className="margo-portrait-avatar__initial"
        style={{
          fontFamily: UI_FONT,
          fontWeight: 700,
          fontSize: size === 'profile' ? '1.5rem' : size === 'feed' ? '1.125rem' : '0.875rem',
          color: initialColor,
          letterSpacing: '-0.04em',
        }}
      >
        {initialChar}
      </span>
    )
  )

  return (
    <span
      className={[
        'margo-portrait-avatar',
        square ? 'margo-portrait-avatar--square' : '',
        brandMark ? 'margo-portrait-avatar--brand' : '',
        seededFallback ? 'margo-portrait-avatar--seed' : '',
        className,
      ].filter(Boolean).join(' ')}
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
