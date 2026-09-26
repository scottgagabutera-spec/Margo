'use client'

import type { CSSProperties, ReactNode } from 'react'

type MargoLongPressHintProps = {
  children: ReactNode
  /** 0–1 while finger is down */
  progress: number
  active: boolean
  style?: CSSProperties
  className?: string
}

/**
 * Subtle gold inset ring while the user holds — signals “keep holding for options”.
 */
export function MargoLongPressHint({
  children,
  progress,
  active,
  style,
  className,
}: MargoLongPressHintProps) {
  const opacity = active ? 0.25 + progress * 0.55 : 0
  const inset = active ? Math.max(0, 3 - progress * 2) : 0

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        borderRadius: 'inherit',
        ...style,
      }}
    >
      {children}
      <div
        aria-hidden
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          inset: `${inset}px`,
          borderRadius: 'inherit',
          boxShadow: active
            ? `inset 0 0 0 2px color-mix(in srgb, var(--gold) ${Math.round(opacity * 100)}%, transparent)`
            : 'none',
          transition: active ? 'none' : 'box-shadow 180ms ease',
        }}
      />
    </div>
  )
}
