'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { MessagesInbox } from '@/components/messages-inbox'
import { LIST_ROW_TYPE, UI_FONT } from '@/lib/fonts'

export default function MessagesLayout({ children }: { children: ReactNode }) {
  const [desktop, setDesktop] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const sync = () => setDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  if (!desktop) {
    return <>{children}</>
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--bg)',
      paddingTop: 'var(--nav-height, 72px)',
      boxSizing: 'border-box',
    }}>
      <aside style={{
        width: 'min(360px, 38vw)',
        flexShrink: 0,
        borderRight: '1px solid var(--border)',
        padding: '12px 14px var(--margo-page-padding-bottom)',
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}>
        <MessagesInbox embedded />
      </aside>
      <div style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {children}
      </div>
    </div>
  )
}

export function MessagesSelectChatPlaceholder() {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <p style={{
        fontFamily: UI_FONT,
        fontSize: LIST_ROW_TYPE.preview,
        color: 'var(--text-muted)',
        margin: 0,
      }}>
        Select a chat
      </p>
    </div>
  )
}
