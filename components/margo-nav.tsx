'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import MargoLogo from '@/components/MargoLogo'

export function MargoNav() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const isOnFeed = pathname === '/feed'
  const isOnMusic = pathname?.startsWith('/music')
  const isOnCompose = pathname === '/compose'

  // Lock body scroll when menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  // Close on route change
  useEffect(() => { setMenuOpen(false) }, [pathname])

  const overlayLinks = [
    { href: '/feed', label: 'Feed', active: isOnFeed },
    { href: '/music', label: 'Music', active: isOnMusic },
    { href: '/compose', label: 'Share a Lyric', active: isOnCompose },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ]

  return (
    <>
      <nav
        className={menuOpen ? undefined : 'margo-nav-bar'}
        style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        padding: '14px 24px',
        borderBottom: menuOpen ? 'none' : '1px solid var(--border)',
        ...(menuOpen ? { background: 'transparent', backdropFilter: 'none', WebkitBackdropFilter: 'none' } : {}),
        transition: 'background 300ms ease, border 300ms ease',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Logo — far left */}
          <Link href="/" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', flexShrink: 0, zIndex: 51, position: 'relative' }}>
            <MargoLogo tier="symbol" size={28} wordmark rings />
          </Link>

          {/* Right side — all items flush right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>

            {/* Desktop only: Feed, Music, Share a Lyric */}
            <div style={{ display: 'none' }} className="margo-desktop-nav">
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
                  transition: 'color 150ms ease', whiteSpace: 'nowrap',
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
              <Link href="/compose" style={{
                fontSize: '0.6rem', fontFamily: 'var(--font-lora), serif',
                fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
                textDecoration: 'none', color: 'var(--bg)',
                background: 'var(--gold)', borderRadius: '50px',
                padding: '9px 20px', marginLeft: '8px',
                transition: 'all 150ms ease', flexShrink: 0, whiteSpace: 'nowrap',
                opacity: isOnCompose ? 0.75 : 1,
              }}>Share a Lyric</Link>
            </div>

            {/* Mobile only: gold + circle for compose */}
            <div className="margo-mobile-compose">
              <Link href="/compose" style={{
                width: 'var(--margo-touch-min)', height: 'var(--margo-touch-min)', borderRadius: '50%',
                background: 'var(--gold)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                textDecoration: 'none', flexShrink: 0,
                marginRight: '4px', boxSizing: 'border-box',
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1v12M1 7h12" stroke="var(--bg)" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </Link>
            </div>

            {/* Hamburger — always visible, far right */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{
                background: 'none', border: 'none',
                cursor: 'pointer', padding: '12px',
                minWidth: 'var(--margo-touch-min)', minHeight: 'var(--margo-touch-min)',
                boxSizing: 'border-box',
                display: 'flex', flexDirection: 'column',
                justifyContent: 'center', gap: '5px',
                outline: 'none', WebkitTapHighlightColor: 'transparent',
                flexShrink: 0, position: 'relative', zIndex: 51,
              }}
              aria-label="Menu"
            >
              <span style={{
                display: 'block', width: '20px', height: '1.5px',
                background: menuOpen ? 'var(--gold)' : 'rgba(255,255,255,0.7)',
                transition: 'all 250ms ease',
                transform: menuOpen ? 'translateY(6.5px) rotate(45deg)' : 'none',
              }} />
              <span style={{
                display: 'block', width: '20px', height: '1.5px',
                background: 'rgba(255,255,255,0.7)',
                transition: 'all 250ms ease',
                opacity: menuOpen ? 0 : 1,
              }} />
              <span style={{
                display: 'block', width: '20px', height: '1.5px',
                background: menuOpen ? 'var(--gold)' : 'rgba(255,255,255,0.7)',
                transition: 'all 250ms ease',
                transform: menuOpen ? 'translateY(-6.5px) rotate(-45deg)' : 'none',
              }} />
            </button>
          </div>
        </div>
      </nav>

      {/* Full page overlay */}
      <div className="margo-nav-overlay" style={{
        position: 'fixed', inset: 0, zIndex: 49,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '8px',
        opacity: menuOpen ? 1 : 0,
        pointerEvents: menuOpen ? 'all' : 'none',
        transition: 'opacity 300ms ease',
      }}>
        {overlayLinks.map(({ href, label, active }, i) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMenuOpen(false)}
            style={{
              fontSize: 'clamp(1.8rem, 6vw, 3.5rem)',
              fontFamily: 'var(--font-lora), serif',
              fontStyle: 'italic',
              fontWeight: 700,
              letterSpacing: '1px',
              textDecoration: 'none',
              color: active ? 'var(--gold)' : 'rgba(255,255,255,0.35)',
              padding: '12px 32px',
              transition: 'color 200ms ease',
              opacity: menuOpen ? 1 : 0,
              transform: menuOpen ? 'translateY(0)' : 'translateY(16px)',
              transitionDelay: menuOpen ? (i * 60) + 'ms' : '0ms',
            }}
          >
            {label}
            {active && (
              <span style={{
                display: 'inline-block', width: '6px', height: '6px',
                borderRadius: '50%', background: 'var(--gold)',
                marginLeft: '12px', verticalAlign: 'middle',
              }} />
            )}
          </Link>
        ))}
      </div>

      {/* Responsive CSS */}
      <style>{`
        .margo-desktop-nav {
          display: none;
        }
        .margo-mobile-compose {
          display: flex;
          align-items: center;
        }
        @media (min-width: 640px) {
          .margo-desktop-nav {
            display: flex !important;
            align-items: center;
            gap: 4px;
          }
          .margo-mobile-compose {
            display: none !important;
          }
        }
      `}</style>
    </>
  )
}
