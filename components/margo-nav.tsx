'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import MargoLogo from '@/components/MargoLogo'

export function MargoNav() {
  const pathname = usePathname()
  const isOnFeed = pathname === '/feed'
  const isOnMusic = pathname?.startsWith('/music')

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
      padding: '16px 24px',
      borderBottom: '1px solid var(--border)',
      background: 'rgba(7,6,10,0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <MargoLogo tier="symbol" size={28} wordmark rings />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {!isOnFeed && (
            <Link href="/feed" style={{
              fontSize: '0.82rem', fontFamily: 'var(--font-lora), serif',
              fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
              textDecoration: 'none', color: 'var(--gold)',
              transition: 'color 150ms ease', padding: '8px 12px',
            }}>Feed</Link>
          )}
          {!isOnMusic && (
            <Link href="/music" style={{
              fontSize: '0.82rem', fontFamily: 'var(--font-lora), serif',
              fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
              textDecoration: 'none', color: 'var(--gold)',
              transition: 'color 150ms ease', padding: '8px 12px',
            }}>Music</Link>
          )}
          <Link href="/compose" style={{
            fontSize: '0.6rem', fontFamily: 'var(--font-lora), serif',
            fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
            textDecoration: 'none', color: 'var(--text-2)',
            border: '1px solid var(--border)', borderRadius: '50px',
            padding: '8px 16px', marginLeft: '8px',
            transition: 'all 150ms ease',
          }}>Share a Lyric</Link>
        </div>
      </div>
    </nav>
  )
}
