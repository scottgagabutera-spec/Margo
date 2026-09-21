'use client'

import type { CSSProperties, ReactNode } from 'react'

interface StoryAvatarRingProps {
  size: number
  hasUnseen?: boolean
  children: ReactNode
  style?: CSSProperties
}

/**
 * Gold ring around avatars with an active Story. Unseen stories get a soft pulse.
 */
export function StoryAvatarRing({
  size,
  hasUnseen = false,
  children,
  style,
}: StoryAvatarRingProps) {
  const ringPad = 2
  const outer = size + ringPad * 2 + 4

  return (
    <span
      className={hasUnseen ? 'margo-story-avatar-ring margo-story-avatar-ring--pulse' : 'margo-story-avatar-ring'}
      style={{
        width: outer,
        height: outer,
        borderRadius: '50%',
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
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        border: '2px solid var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        background: 'var(--surface-2)',
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
