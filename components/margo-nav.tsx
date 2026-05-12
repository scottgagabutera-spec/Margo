'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import MargoLogo from '@/components/MargoLogo'

export function MargoNav() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const isOnFeed = pathname === '/feed'
  const isOnMusic = pathname?.startsWith('/music')
  const isOnCompose = pathname === '/compose'

  const navLink = (href: string, label: string, active: boolean) => (
    <Link href={href} onClick={() => setMenuOpen(false)} style={{
      fontSize: '0.75rem', fontFamily: 'var(--font-lora), serif',
      fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
      textDecoration: 'none',
      color: active ? 'var(--gold)' : 'rgba(255,255,255,0.5)',
      padding: '8px 12px', position: 'relative',
      transition: 'color 150ms ease',
    }}>
      {label}
      {active && (
        <span style={{
          position: 'absolute', bottom: '2px', left: '50%',
          transform: 'translateX(-50%)',
          width: '18px', height: '2px',
          background: 'var(--gold)', borderRadius: '2px',
        }} />
      )}
    </Link>
  )

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(7,6,10,0.90)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1200px', margin: '0 auto' }}>
          
          {/* Logo */}
          <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <MargoLogo tier="symbol" size={28} wordmark rings />
          </Link>

          {/* Desktop nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {navLink('/feed', 'Feed', isOnFeed)}
            {navLink('/music', 'Music', isOnMusic)}

            {/* Share a Lyric — solid gold CTA */}
            <Link href="/compose" onClick={() => setMenuOpen(false)} style={{
              fontSize: '0.6rem', fontFamily: 'var(--font-lora), serif',
              fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
              textDecoration: 'none',
              color: isOnCompose ? 'var(--bg)' : 'var(--bg)',
              background: 'var(--gold)',
              borderRadius: '50px',
              padding: '9px 18px', marginLeft: '12px',
              transition: 'all 150ms ease',
              opacity: isOnCompose ? 0.8 : 1,
              flexShrink: 0,
            }}>Share a Lyric</Link>

            {/* Hamburger */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{
                marginLeft: '12px', background: 'none', border: 'none',
                cursor: 'pointer', padding: '8px', color: 'rgba(255,255,255,0.5)',
                display: 'flex', flexDirection: 'column', gap: '4px',
                outline: 'none', WebkitTapHighlightColor: 'transparent',
                flexShrink: 0,
              }}
              aria-label="Menu"
            >
              <span style={{ display: 'block', width: '18px', height: '1.5px', background: menuOpen ? 'var(--gold)' : 'rgba(255,255,255,0.5)', transition: 'all 200ms ease', transform: menuOpen ? 'translateY(5.5px) rotate(45deg)' : 'none' }} />
              <span style={{ display: 'block', width: '18px', height: '1.5px', background: menuOpen ? 'transparent' : 'rgba(255,255,255,0.5)', transition: 'all 200ms ease' }} />
              <span style={{ display: 'block', width: '18px', height: '1.5px', background: menuOpen ? 'var(--gold)' : 'rgba(255,255,255,0.5)', transition: 'all 200ms ease', transform: menuOpen ? 'translateY(-5.5px) rotate(-45deg)' : 'none' }} />
            </button>
          </div>
        </div>
      </nav>

      {/* Hamburger dropdown */}
      {menuOpen && (
        <div style={{
          position: 'fixed', top: '57px', left: 0, right: 0, zIndex: 39,
          background: 'rgba(7,6,10,0.97)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border)',
          padding: '8px 0 16px',
        }}>
          {[
            { href: '/feed', label: 'Feed', active: isOnFeed },
            { href: '/music', label: 'Music', active: isOnMusic },
            { href: '/about', label: 'About' },
            { href: '/contact', label: 'Contact' },
          ].map(({ href, label, active }) => (
            <Link key={href} href={href} onClick={() => setMenuOpen(false)} style={{
              display: 'block', padding: '14px 24px',
              fontSize: '0.85rem', fontFamily: 'var(--font-lora), serif',
              fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
              textDecoration: 'none',
              color: active ? 'var(--gold)' : 'rgba(255,255,255,0.6)',
              borderLeft: active ? '2px solid var(--gold)' : '2px solid transparent',
              transition: 'all 150ms ease',
            }}>{label}</Link>
          ))}
        </div>
      )}
    </>
  )
}
