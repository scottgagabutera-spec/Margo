'use client'

import type { CSSProperties, ReactNode, RefObject } from 'react'

export interface MargoConversationLayoutProps {
  header: ReactNode
  children: ReactNode
  /** Fixed composer (e.g. KeyboardSafeCtaBar) — rendered as sibling; stays out of scroll flow. */
  composer: ReactNode
  scrollRef?: RefObject<HTMLDivElement | null>
  onScroll?: () => void
  /**
   * Mobile thread: full viewport under conversation header (no MargoNav above).
   * Desktop: offset below --nav-height.
   */
  compactTopChrome?: boolean
}

const shellBase: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  background: 'var(--bg)',
  boxSizing: 'border-box',
}

const scrollRegion: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  WebkitOverflowScrolling: 'touch',
  paddingTop: '16px',
  paddingLeft: '20px',
  paddingRight: '20px',
  paddingBottom: 'calc(var(--margo-cta-bar-h, 72px) + 12px)',
}

/**
 * Three-zone conversation frame: fixed header, scrollable message list, fixed composer.
 * The message list is the only scroll owner; document/window must not scroll the thread.
 */
export function MargoConversationLayout({
  header,
  children,
  composer,
  scrollRef,
  onScroll,
  compactTopChrome = false,
}: MargoConversationLayoutProps) {
  return (
    <>
      <div
        className="margo-conversation-shell"
        data-compact-top={compactTopChrome ? '1' : '0'}
        style={{
          ...shellBase,
          height: compactTopChrome
            ? '100dvh'
            : 'calc(100dvh - var(--nav-height, 72px))',
          marginTop: compactTopChrome ? 0 : 'var(--nav-height, 72px)',
        }}
      >
        {header}
        <div ref={scrollRef} onScroll={onScroll} style={scrollRegion}>
          <div
            style={{
              maxWidth: '560px',
              width: '100%',
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {children}
          </div>
        </div>
      </div>
      {composer}
    </>
  )
}
