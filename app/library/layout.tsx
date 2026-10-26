'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { LibraryPageBody } from '@/components/library-page-body'

export default function LibraryLayout({ children }: { children: ReactNode }) {
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
      flexDirection: 'column',
      minHeight: '100vh',
      background: 'var(--bg)',
      paddingTop: 'var(--nav-height, 72px)',
    }}>
      <LibraryPageBody layoutMode="desktop-split" />
    </div>
  )
}
