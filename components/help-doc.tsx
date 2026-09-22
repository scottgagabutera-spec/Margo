'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { TYPE, UI_FONT } from '@/lib/fonts'

const font = UI_FONT

const FOOTER = ['help', 'faq', 'about', 'privacy', 'terms', 'contact'] as const

export function HelpDoc({
  kicker,
  title,
  children,
}: {
  kicker: string
  title: string
  children: ReactNode
}) {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{
        maxWidth: '640px',
        margin: '0 auto',
        padding: 'calc(var(--nav-height, 72px) + 16px) 24px var(--margo-page-padding-bottom)',
      }}>
        <p style={{
          fontFamily: font,
          fontSize: TYPE.label,
          fontWeight: 700,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          margin: '0 0 8px',
        }}>
          {kicker}
        </p>
        <h1 style={{
          fontFamily: font,
          fontSize: TYPE.pageTitle,
          fontWeight: 700,
          color: 'var(--text)',
          margin: '0 0 24px',
          lineHeight: 1.2,
        }}>
          {title}
        </h1>
        <div style={{
          fontFamily: font,
          fontSize: TYPE.body,
          color: 'var(--text-secondary)',
          lineHeight: 1.65,
        }}>
          {children}
        </div>
        <div style={{
          display: 'flex',
          gap: '20px',
          flexWrap: 'wrap',
          marginTop: '48px',
          paddingTop: '24px',
          borderTop: '1px solid var(--border)',
        }}>
          {FOOTER.map((p) => (
            <Link
              key={p}
              href={`/${p}`}
              style={{
                fontFamily: font,
                fontSize: TYPE.label,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                textDecoration: 'none',
              }}
            >
              {p}
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}

export function HelpH2({ children }: { children: ReactNode }) {
  return (
    <h2 style={{
      fontFamily: font,
      fontSize: TYPE.song,
      fontWeight: 700,
      color: 'var(--text)',
      margin: '28px 0 8px',
    }}>
      {children}
    </h2>
  )
}

export function HelpP({ children }: { children: ReactNode }) {
  return (
    <p style={{ margin: '0 0 12px' }}>{children}</p>
  )
}

export function HelpA({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} style={{ color: 'var(--gold)', textDecoration: 'none' }}>
      {children}
    </Link>
  )
}

