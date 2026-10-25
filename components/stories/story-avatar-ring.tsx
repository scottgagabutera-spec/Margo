'use client'

import type { CSSProperties, ReactNode } from 'react'

interface StoryAvatarRingProps {
  size: number
  hasUnseen?: boolean
  children: ReactNode
  style?: CSSProperties
  /** Portrait feed avatar — rounded-rect ring matching 4:5 tile. */
  shape?: 'circle' | 'portrait'
  portraitWidth?: number
  portraitHeight?: number
  portraitRadius?: number
}

/**
 * Gold ring around avatars with an active Story. Unseen stories get a soft pulse.
 */
export function StoryAvatarRing({
  size,
  hasUnseen = false,
  children,
  style,
  shape = 'circle',
  portraitWidth,
  portraitHeight,
  portraitRadius = 10,
}: StoryAvatarRingProps) {
  const ringPad = 2
  const isPortrait = shape === 'portrait'
  const innerW = isPortrait ? (portraitWidth ?? size) : size
  const innerH = isPortrait ? (portraitHeight ?? Math.round(size * 1.25)) : size
  const outerW = innerW + ringPad * 2 + 4
  const outerH = innerH + ringPad * 2 + 4
  const outerRadius = isPortrait ? portraitRadius + 4 : '50%'
  const innerRadius = isPortrait ? portraitRadius : '50%'

  return (
    <span
      className={hasUnseen ? 'margo-story-avatar-ring margo-story-avatar-ring--pulse' : 'margo-story-avatar-ring'}
      style={{
        width: isPortrait ? outerW : outerW,
        height: isPortrait ? outerH : outerW,
        borderRadius: outerRadius,
        padding: ringPad,
        flexShrink: 0,
        background: hasUnseen
          ? 'linear-gradient(135deg, var(--gold), rgba(232,197,71,0.55))'
          : 'linear-gradient(135deg, var(--gold), rgba(232,197,71,0.35))',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <span style={{
        width: innerW,
        height: innerH,
        borderRadius: innerRadius,
        overflow: isPortrait ? 'visible' : 'hidden',
        border: isPortrait ? 'none' : '2px solid var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        background: isPortrait ? 'transparent' : 'var(--surface-2)',
      }}>
        {children}
      </span>
      <style>{`
        @keyframes margo-story-ring-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(232,197,71,0.45); }
          50% { box-shadow: 0 0 0 4px rgba(232,197,71,0.12); }
        }
        .margo-story-avatar-ring--pulse {
          animation: margo-story-ring-pulse 2.4s ease-in-out infinite;
        }
      `}</style>
    </span>
  )
}
