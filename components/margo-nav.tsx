'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import MargoLogo from '@/components/MargoLogo'

export function MargoNav() {
  const pathname = usePathname()

  const linkStyle = (active: boolean): React.CSSProperties => ({
    fontSize: '0.82rem',
    fontFamily: 'var(--font-lora), serif',
    fontWeight: 700,
    letterSpacing: '2px',
    textTransform: 'uppercase',
    textDecoration: 'none',
    color: 'var(--gold)',
    transition: 'color 150ms ease',
    padding: '8px 12px',
  })

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
      padding: '16px 24px',
      borderBottom: '1px solid var(--border)',
      background: 'rgba(7,6,10,0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <MargoLogo tier="symbol" size={28} wordmark />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link href="/feed" style={linkStyle(pathname === '/feed')}>Feed</Link>
          {!pathname?.startsWith('/music') && (
            <Link href="/music" style={linkStyle(false)}>Music</Link>
          )}
        </div>
      </div>
    </nav>
  )
}
