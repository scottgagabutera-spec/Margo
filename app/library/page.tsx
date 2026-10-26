'use client'

import { useEffect, useState } from 'react'
import { LibraryPageBody } from '@/components/library-page-body'

export default function LibraryPage() {
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
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{
        maxWidth: '560px',
        margin: '0 auto',
        padding: 'calc(var(--nav-height, 72px) + 12px) 16px var(--margo-page-padding-bottom)',
      }}>
        <LibraryPageBody />
      </div>
    </main>
  )
}
