'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { LibraryPageBody } from '@/components/library-page-body'
import { LIST_ROW_TYPE, UI_FONT } from '@/lib/fonts'

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
      minHeight: '100vh',
      background: 'var(--bg)',
      paddingTop: 'var(--nav-height, 72px)',
    }}>
      <div style={{
        width: 'min(420px, 42vw)',
        borderRight: '1px solid var(--border)',
        padding: '12px 16px var(--margo-page-padding-bottom)',
        overflowY: 'auto',
      }}>
        <LibraryPageBody />
      </div>
      <div style={{
        flex: 1,
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <p style={{ fontFamily: UI_FONT, fontSize: LIST_ROW_TYPE.preview, color: 'var(--text-muted)' }}>
          Lyrics show here while a song plays
        </p>
      </div>
    </div>
  )
}
