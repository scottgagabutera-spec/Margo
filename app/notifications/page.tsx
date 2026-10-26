'use client'

import { useEffect, useState } from 'react'
import { NotificationsInbox } from '@/components/notifications-inbox'

export default function NotificationsPage() {
  const [desktop, setDesktop] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const sync = () => setDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  if (desktop) {
    return null
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <main style={{
        maxWidth: '560px',
        margin: '0 auto',
        padding: 'calc(var(--nav-height, 72px) + 12px) 16px var(--margo-page-padding-bottom)',
      }}>
        <NotificationsInbox />
      </main>
    </div>
  )
}
