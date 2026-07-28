'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import MargoLogo from '@/components/MargoLogo'
import { useIdentity } from '@/hooks/useIdentity'
import { useArtistApplication } from '@/hooks/useArtistApplication'
import { supabase } from '@/lib/supabase'

const font = 'var(--font-lora), serif'

export function MargoNav() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const avatarMenuRef = useRef<HTMLDivElement>(null)
  const { user, identity } = useIdentity()
  const { application } = useArtistApplication()

  const isOnFeed = pathname === '/feed'
  const isOnMusic = pathname?.startsWith('/music')
  const isOnCompose = pathname === '/compose'
  const isOnSignin = pathname === '/signin'
  const isOnApplyArtist = pathname === '/apply-artist'
  const isOnSettings = pathname === '/settings'

  const isSignedIn = !!user && !user.isAnonymous
  const applicationStatus = application?.status ?? 'none'
  const showApplyCTA = isSignedIn && !identity?.isArtist
  const applyLabel =
    applicationStatus === 'pending' ? 'Application Pending' :
    applicationStatus === 'rejected' ? 'Reapply as Artist' :
    'Apply as an Artist'

  const ownProfileHref = identity ? `/profile/${identity.username}` : null
  const isOnOwnProfile = ownProfileHref ? pathname === ownProfileHref : false

  const handleSignOut = async () => {
    setMenuOpen(false)
    setAvatarMenuOpen(false)
    await supabase.auth.signOut()
  }

  // Lock body scroll when menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  // Close on route change
  useEffect(() => { setMenuOpen(false); setAvatarMenuOpen(false) }, [pathname])

  // Close avatar dropdown on outside click
  useEffect(() => {
    if (!avatarMenuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
        setAvatarMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [avatarMenuOpen])

  const overlayLinks = [
    { href: '/feed', label: 'Feed', active: isOnFeed },
    { href: '/music', label: 'Music', active: isOnMusic },
    { href: '/compose', label: 'Share a Lyric', active: isOnCompose },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ]

  const avatarDropdownItems = ownProfileHref ? [
    { href: ownProfileHref, label: 'Profile' },
    { href: '/settings', label: 'Account Settings' },
    ...(showApplyCTA ? [{ href: '/apply-artist', label: applyLabel }] : []),
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ] : []

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

            {/* Desktop only: Feed, Music, Sign In / Apply, avatar, Share a Lyric */}
            <div style={{ display: 'none' }} className="margo-desktop-nav">
              {[
                { href: '/feed', label: 'Feed', active: isOnFeed },
                { href: '/music', label: 'Music', active: isOnMusic },
              ].map(({ href, label, active }) => (
                <Link key={href} href={href} style={{
                  fontSize: '0.75rem', fontFamily: font,
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

              {!isSignedIn ? (
                <Link href="/signin" style={{
                  fontSize: '0.65rem', fontFamily: font,
                  fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase',
                  textDecoration: 'none',
                  color: isOnSignin ? 'var(--gold)' : 'rgba(255,255,255,0.35)',
                  padding: '8px 14px', marginLeft: '4px',
                  transition: 'color 150ms ease', whiteSpace: 'nowrap',
                }}>Sign In</Link>
              ) : null}

              {/* Signed-in identity — avatar opens dropdown menu */}
              {isSignedIn && identity && ownProfileHref && (
                <div ref={avatarMenuRef} style={{ position: 'relative', marginLeft: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setAvatarMenuOpen(o => !o)}
                    aria-label={`${identity.displayName}'s account menu`}
                    aria-expanded={avatarMenuOpen}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '32px', height: '32px', borderRadius: '50%',
                      flexShrink: 0, overflow: 'hidden',
                      background: identity.avatarUrl ? 'none' : 'linear-gradient(135deg, var(--gold), var(--gold-2))',
                      border: (isOnOwnProfile || isOnSettings || avatarMenuOpen) ? '2px solid var(--gold)' : '1px solid rgba(232,197,71,0.2)',
                      boxSizing: 'border-box', transition: 'border-color 150ms ease',
                      cursor: 'pointer', padding: 0,
                    }}
                  >
                    {identity.avatarUrl ? (
                      <img src={identity.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontFamily: font, fontSize: '0.65rem', fontWeight: 700, color: 'var(--bg)' }}>
                        {(identity.displayName || '??').slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </button>

                  {avatarMenuOpen && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                      minWidth: '200px', background: 'var(--bg)',
                      border: '1px solid var(--border)', borderRadius: '10px',
                      boxShadow: '0 12px 28px rgba(0,0,0,0.45)',
                      padding: '6px', zIndex: 60,
                    }}>
                      {avatarDropdownItems.map(({ href, label }) => (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setAvatarMenuOpen(false)}
                          style={{
                            display: 'block', fontFamily: font, fontSize: '0.8rem',
                            textDecoration: 'none',
                            color: pathname === href ? 'var(--gold)' : 'rgba(255,255,255,0.75)',
                            padding: '9px 12px', borderRadius: '6px',
                            transition: 'background 120ms ease, color 120ms ease',
                          }}
                        >
                          {label}
                        </Link>
                      ))}
                      <div style={{ height: '1px', background: 'var(--border)', margin: '6px 4px' }} />
                      <button
                        type="button"
                        onClick={handleSignOut}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          fontFamily: font, fontSize: '0.8rem',
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'rgba(255,255,255,0.5)',
                          padding: '9px 12px', borderRadius: '6px',
                        }}
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              )}

              <Link href="/compose" style={{
                fontSize: '0.6rem', fontFamily: font,
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
        {/* Signed-in identity row — avatar + name, shown above the main links */}
        {isSignedIn && identity && ownProfileHref && (
          <Link
            href={ownProfileHref}
            onClick={() => setMenuOpen(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              textDecoration: 'none', marginBottom: '20px',
              opacity: menuOpen ? 1 : 0,
              transform: menuOpen ? 'translateY(0)' : 'translateY(16px)',
              transition: 'opacity 300ms ease, transform 300ms ease',
            }}
          >
            <span style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden',
              background: identity.avatarUrl ? 'none' : 'linear-gradient(135deg, var(--gold), var(--gold-2))',
              border: '1px solid rgba(232,197,71,0.2)', flexShrink: 0,
            }}>
              {identity.avatarUrl ? (
                <img src={identity.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontFamily: font, fontSize: '0.75rem', fontWeight: 700, color: 'var(--bg)' }}>
                  {(identity.displayName || '??').slice(0, 2).toUpperCase()}
                </span>
              )}
            </span>
            <span style={{ fontFamily: font, fontSize: '0.9rem', color: 'var(--text)' }}>
              {identity.displayName}
            </span>
          </Link>
        )}

        {overlayLinks.map(({ href, label, active }, i) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMenuOpen(false)}
            style={{
              fontSize: 'clamp(1.8rem, 6vw, 3.5rem)',
              fontFamily: font,
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

        {/* Quiet, separated Sign In / Apply / Account Settings / Sign Out — deliberately smaller, below the main links */}
        {!isSignedIn ? (
          <Link
            href="/signin"
            onClick={() => setMenuOpen(false)}
            style={{
              marginTop: '24px',
              fontSize: '0.7rem',
              fontFamily: font,
              fontWeight: 600,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              textDecoration: 'none',
              color: isOnSignin ? 'var(--gold)' : 'rgba(255,255,255,0.3)',
              padding: '12px 32px',
              transition: 'color 200ms ease',
              opacity: menuOpen ? 1 : 0,
              transform: menuOpen ? 'translateY(0)' : 'translateY(16px)',
              transitionDelay: menuOpen ? (overlayLinks.length * 60) + 'ms' : '0ms',
            }}
          >
            Sign In
          </Link>
        ) : (
          <>
            <Link
              href="/settings"
              onClick={() => setMenuOpen(false)}
              style={{
                marginTop: '24px',
                fontSize: '0.7rem',
                fontFamily: font,
                fontWeight: 600,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                textDecoration: 'none',
                color: isOnSettings ? 'var(--gold)' : 'rgba(255,255,255,0.3)',
                padding: '12px 32px',
                transition: 'color 200ms ease',
                opacity: menuOpen ? 1 : 0,
                transform: menuOpen ? 'translateY(0)' : 'translateY(16px)',
                transitionDelay: menuOpen ? (overlayLinks.length * 60) + 'ms' : '0ms',
              }}
            >
              Account Settings
            </Link>
            {showApplyCTA && (
              <Link
                href="/apply-artist"
                onClick={() => setMenuOpen(false)}
                style={{
                  marginTop: '4px',
                  fontSize: '0.7rem',
                  fontFamily: font,
                  fontWeight: 600,
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  color: isOnApplyArtist ? 'var(--gold)' : 'rgba(255,255,255,0.3)',
                  padding: '12px 32px',
                  transition: 'color 200ms ease',
                  opacity: menuOpen ? 1 : 0,
                  transform: menuOpen ? 'translateY(0)' : 'translateY(16px)',
                  transitionDelay: menuOpen ? ((overlayLinks.length + 1) * 60) + 'ms' : '0ms',
                }}
              >
                {applyLabel}
              </Link>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              style={{
                marginTop: '4px',
                fontSize: '0.7rem',
                fontFamily: font,
                fontWeight: 600,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.3)',
                padding: '12px 32px',
                minHeight: 'var(--margo-touch-min)', boxSizing: 'border-box',
                transition: 'color 200ms ease',
                opacity: menuOpen ? 1 : 0,
                transform: menuOpen ? 'translateY(0)' : 'translateY(16px)',
                transitionDelay: menuOpen ? ((overlayLinks.length + 2) * 60) + 'ms' : '0ms',
              }}
            >
              Sign Out
            </button>
          </>
        )}
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