'use client'

import { TYPE, UI_FONT } from '@/lib/fonts'
import type { ReactNode } from 'react'

const font = UI_FONT

/** Inline status — avoids full-page dark loading flashes. */
export function PromoteInlineStatus({
  message,
  tone = 'muted',
}: {
  message: string
  tone?: 'muted' | 'gold'
}) {
  return (
    <p style={{
      fontFamily: font,
      fontSize: TYPE.secondary,
      color: tone === 'gold' ? 'var(--gold)' : 'var(--text-muted)',
      margin: '0 0 12px',
    }}>
      {message}
    </p>
  )
}

export function PromotePageFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        maxWidth: 640,
        margin: '0 auto',
        padding: 'calc(var(--nav-height, 72px) + 24px) 24px var(--margo-page-padding-bottom)',
      }}
    >
      {children}
    </div>
  )
}
