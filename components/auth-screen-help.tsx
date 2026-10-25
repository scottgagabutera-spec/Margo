'use client'

import Link from 'next/link'
import { TYPE, UI_FONT } from '@/lib/fonts'

const ui = UI_FONT

export function AuthScreenHelp() {
  return (
    <p style={{
      marginTop: '20px',
      textAlign: 'center',
      fontFamily: ui,
      fontSize: TYPE.label,
      fontWeight: 700,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
    }}>
      <Link
        href="/help/account"
        style={{
          color: 'var(--text-muted)',
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          minHeight: 'var(--margo-touch-min)',
          padding: '0 8px',
        }}
      >
        Help
      </Link>
    </p>
  )
}
