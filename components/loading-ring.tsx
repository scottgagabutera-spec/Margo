'use client'

import type { CSSProperties, ReactNode } from 'react'

export type LoadingRingState = 'progress' | 'ready' | 'spinning'

export interface LoadingRingProps {
  /** Static center — mark / icon. Never rotated by this component. */
  children?: ReactNode
  /** Outer diameter in px. Default 44 (≈ touch min). */
  size?: number
  /** Ring stroke width in px. */
  strokeWidth?: number
  /**
   * Visual phase:
   * - progress: arc length tracks `progress` (0–1)
   * - ready: full ring + soft-pulse
   * - spinning: partial arc + continuous spin (margo-spin)
   */
  state?: LoadingRingState
  /** Used when state === 'progress'. Clamped 0–1. */
  progress?: number
  className?: string
  style?: CSSProperties
}

/**
 * Reusable brand loader: static center + animated gold ring/arc.
 * Prefer this over rotating asymmetric marks (e.g. MargoLogo).
 */
export function LoadingRing({
  children,
  size = 44,
  strokeWidth = 2,
  state = 'progress',
  progress = 0,
  className,
  style,
}: LoadingRingProps) {
  const p = Math.max(0, Math.min(1, progress))
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r
  const ready = state === 'ready'
  const spinning = state === 'spinning'

  // Spinning shows a ~28% arc; ready/progress use tracked or full dash.
  const dash =
    spinning ? c * 0.28 : ready ? c : c * p
  const gap = Math.max(0, c - dash)

  let ringClass = ''
  if (spinning) ringClass = 'margo-spin'
  else if (ready) ringClass = 'margo-soft-pulse'

  const trackOpacity = ready || spinning || p > 0.02 ? 1 : 0.35

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...style,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'visible',
        }}
      >
        {/* Quiet track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--gold-border)"
          strokeWidth={strokeWidth}
          opacity={trackOpacity * 0.55}
        />
        {/* Animated arc — spin/pulse on inner g so -90° start angle is preserved */}
        <g style={{ transformOrigin: '50% 50%', transform: 'rotate(-90deg)' }}>
          <g
            className={ringClass || undefined}
            style={{ transformOrigin: '50% 50%' }}
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="var(--gold)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${gap}`}
              style={{
                transition:
                  spinning || ready
                    ? undefined
                    : 'stroke-dasharray 80ms var(--ease-out)',
                filter: ready || spinning ? 'drop-shadow(0 0 6px var(--gold-glow))' : undefined,
              }}
            />
          </g>
        </g>
      </svg>
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        {children}
      </div>
    </div>
  )
}
