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

  const menuItems = [
    { href: '/feed', label: 'Feed', active: isOnFeed },
    { href: '/music', label: 'Music', active: isOnMusic },
    { href: '/compose', label: 'Share a Lyric', active: isOnCompose },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ]

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
        padding: '14px 24px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(7,6,10,0.90)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '1200px', margin: '0 auto',
        }}>

          {/* Left — Logo */}
          <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <MargoLogo tier="symbol" size={28} wordmark rings />
          </Link>

          {/* Right — desktop nav + hamburger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>

            {/* Desktop only — Feed, Music, Share a Lyric */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} className="desktop-nav">
              {[
                { href: '/feed', label: 'Feed', active: isOnFeed },
                { href: '/music', label: 'Music', active: isOnMusic },
              ].map(({ href, label, active }) => (
                <Link key={href} href={href} style={{
                  fontSize: '0.75rem', fontFamily: 'var(--font-lora), serif',
                  fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
                  textDecoration: 'none',
                  color: active ? 'var(--gold)' : 'rgba(255,255,255,0.5)',
                  padding: '8px 14px', position: 'relative',
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
              ))}

              {/* Share a Lyric — solid gold, desktop only */}
              <Link href="/compose" style={{
                fontSize: '0.6rem', fontFamily: 'var(--font-lora), serif',
                fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
                textDecoration: 'none',
                color: 'var(--bg)',
                background: isOnCompose ? 'rgba(232,197,71,0.8)' : 'var(--gold)',
                borderRadius: '50px',
                padding: '9px 20px', marginLeft: '8px',
                transition: 'all 150ms ease', flexShrink: 0,
                whiteSpace: 'nowrap',
              }}>Share a Lyric</Link>
            </div>

            {/* Hamburger — always visible */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{
                marginLeft: '16px', background: 'none', border: 'none',
                cursor: 'pointer', padding: '8px',
                display: 'flex', flexDirection: 'column',
                justifyContent: 'center', gap: '5px',
                outline: 'none', WebkitTapHighlightColor: 'transparent',
                flexShrink: 0,
              }}
              aria-label="Menu"
            >
              <span style={{
                display: 'block', width: '20px', height: '1.5px',
                background: menuOpen ? 'var(--gold)' : 'rgba(255,255,255,0.6)',
                transition: 'all 220ms ease',
                transform: menuOpen ? 'translateY(6.5px) rotate(45deg)' : 'none',
              }} />
              <span style={{
                display: 'block', width: '20px', height: '1.5px',
                background: menuOpen ? 'transparent' : 'rgba(255,255,255,0.6)',
                transition: 'all 220ms ease',
                opacity: menuOpen ? 0 : 1,
              }} />
              <span style={{
                display: 'block', width: '20px', height: '1.5px',
                background: menuOpen ? 'var(--gold)' : 'rgba(255,255,255,0.6)',
                transition: 'all 220ms ease',
                transform: menuOpen ? 'translateY(-6.5px) rotate(-45deg)' : 'none',
              }} />
            </button>
          </div>
        </div>
      </nav>

      {/* Dropdown menu */}
      <div style={{
        position: 'fixed', top: '57px', left: 0, right: 0, zIndex: 39,
        background: 'rgba(7,6,10,0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: menuOpen ? '1px solid var(--border)' : 'none',
        maxHeight: menuOpen ? '400px' : '0px',
        overflow: 'hidden',
        transition: 'max-height 280ms ease, border-bottom 280ms ease',
      }}>
        <div style={{ padding: menuOpen ? '8px 0 20px' : '0' }}>
          {menuItems.map(({ href, label, active }) => (
            <Link key={href} href={href} onClick={() => setMenuOpen(false)} style={{
              display: 'block', padding: '14px 28px',
              fontSize: '0.85rem', fontFamily: 'var(--font-lora), serif',
              fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
              textDecoration: 'none',
              color: active ? 'var(--gold)' : 'rgba(255,255,255,0.55)',
              borderLeft: active ? '2px solid var(--gold)' : '2px solid transparent',
              transition: 'all 150ms ease',
            }}>{label}</Link>
          ))}
        </div>
      </div>

      {/* Mobile CSS — hide desktop nav items */}
      <style>{`
        @media (max-width: 640px) {
          .desktop-nav { display: none !important; }
        }
      `}</style>

      {/* Backdrop */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 38,
            background: 'rgba(0,0,0,0.4)',
          }}
        />
      )}
    </>
  )
}
