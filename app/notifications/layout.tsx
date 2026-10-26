'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { NotificationsInbox } from '@/components/notifications-inbox'
import { NotificationPostPane } from '@/components/notification-post-pane'

export default function NotificationsLayout({ children }: { children: ReactNode }) {
  const [desktop, setDesktop] = useState(false)
  const [postId, setPostId] = useState<string | null>(null)

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
    }}>
      <aside style={{
        width: 'min(380px, 40vw)',
        borderRight: '1px solid var(--border)',
        padding: '12px 14px var(--margo-page-padding-bottom)',
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}>
        <NotificationsInbox embedded desktop selectedPostId={postId} onSelectPost={setPostId} />
      </aside>
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
        <NotificationPostPane postId={postId} />
      </div>
    </div>
  )
}
