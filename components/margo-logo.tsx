'use client'

import type { CSSProperties } from 'react'
import { MargoPortraitBrandMark } from '@/components/margo-portrait-brand-mark'
import { MargoSymbol } from '@/components/margo-symbol'

export type MargoLogoVariant = 'plate' | 'mark'

const PLATE_PX: Record<'xs' | 'sm' | 'md' | 'lg', { box: number; radius: number; symbol: number }> = {
  xs: { box: 28, radius: 7, symbol: 0 },
  sm: { box: 40, radius: 9, symbol: 0 },
  md: { box: 52, radius: 12, symbol: 22 },
  lg: { box: 72, radius: 14, symbol: 0 },
}

export type MargoLogoSize = keyof typeof PLATE_PX

/**
 * Official Margo mark — always high contrast (gold on dark plate + ring, or gold symbol).
 */
export function MargoLogo({
  size = 'sm',
  variant = 'plate',
  className,
  style,
  title = 'Margo',
}: {
  size?: MargoLogoSize
  variant?: MargoLogoVariant
  className?: string
  style?: CSSProperties
  title?: string
}) {
  if (variant === 'mark') {
    const symbolPx = size === 'xs' ? 20 : size === 'sm' ? 28 : size === 'md' ? 36 : 48
    return (
      <MargoSymbol
        size={symbolPx}
        variant="gold"
        className={className}
        style={style}
      />
    )
  }

  const dim = PLATE_PX[size]
  return (
    <span
      className={['margo-logo-plate', className].filter(Boolean).join(' ')}
      title={title}
      style={{
        width: dim.box,
        height: dim.box,
        borderRadius: dim.radius,
        boxSizing: 'border-box',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        background: '#0a090d',
        border: '1px solid var(--gold-border)',
        boxShadow: '0 0 0 1px rgba(232,197,71,0.12), 0 4px 16px rgba(0,0,0,0.35)',
        ...style,
      }}
    >
      <span
        className="margo-logo-plate__inset"
        style={{
          width: '72%',
          height: '72%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MargoPortraitBrandMark className="margo-logo-plate__mark" />
      </span>
    </span>
  )
}
