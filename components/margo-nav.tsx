'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import MargoLogo from '@/components/MargoLogo'
import { useIdentity } from '@/hooks/useIdentity'
import { useArtistApplication } from '@/hooks/useArtistApplication'
import { supabase } from '@/lib/supabase'
import { NotificationBell } from '@/components/notification-bell'
import { MessagesIcon } from '@/components/messages-icon'

const font = 'var(--font-lora), serif'

/**
 * Top nav. Logo + MessagesIcon are always visible (both mobile and
 * desktop) — giants put DM access in the top bar, not the bottom tab
 * bar, since the bottom bar is already full at 5 slots. Text nav
 * (Feed/Music, Share a Lyric, notification bell, avatar menu) stays
 * desktop-only; mobile gets those via MobileTabBar instead.
 *
 * background is set explicitly inline (var(--bg), fully opaque) rather
 * than depending on an external CSS class loading correctly — this was
 * the root cause of the nav appearing transparent with content visible
 * scrolling behind it.
 */
export function MargoNav() {
  const pathname = usePathname()
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const avatarMenuRef = useRef<HTMLDivElement>(null)
  const { user, identity } = useIdentity()
  const { application } = useArtistApplication()

  const isOnFeed = pathname === '/feed'
  const isOnMusic = pathname?.startsWith('/music')
  const isOnCompose = pathname === '/compose'
  const isOnSignin = pathname === '/signin'

  const isSignedIn = !!user && !user.isAnonymous
  const applicationStatus = application?.status ?? 'none'
  const showApplyCTA = isSignedIn && !identity?.isArtist
  const applyLabel =
    applicationStatus === 'pending' ? 'Application Pending' :
    applicationStatus === 'rejected' ? 'Reapply as Artist' :
    'Apply as an Artist'

  const ownProfileHref = identity ? `/profile/${identity.username}` : null

  const handleSignOut = async () => {
    setAvatarMenuOpen(false)
    await supabase.auth.signOut()
  }

  useEffect(() => { setAvatarMenuOpen(false) }, [pathname])

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

  const avatarDropdownItems = ownProfileHref ? [
    { href: ownProfileHref, label: 'Profile' },
    { href: '/settings', label: 'Account Settings' },
    ...(showApplyCTA ? [{ href: '/apply-artist', label: applyLabel }] : []),
  ] : []

  return (
    <nav className="margo-nav-bar" style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      padding: '14px 24px',
      background: 'var(--bg)',
      boxShadow: '0 1px 24px rgba(0,0,0,0.35)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <MargoLogo tier="symbol" size={28} wordmark rings />
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {isSignedIn && <MessagesIcon />}

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
                padding: '0 14px', position: 'relative',
                minHeight: 'var(--margo-touch-min)',
                display: 'inline-flex', alignItems: 'center',
                boxSizing: 'border-box',
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
              fontSize: '0.6rem', fontFamily: font,
              fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
              textDecoration: 'none', color: 'var(--bg)',
              background: 'var(--gold)', borderRadius: '50px',
              padding: '0 20px', marginLeft: '8px',
              minHeight: 'var(--margo-touch-min)',
              display: 'inline-flex', alignItems: 'center',
              boxSizing: 'border-box',
              transition: 'all 150ms ease', flexShrink: 0, whiteSpace: 'nowrap',
              opacity: isOnCompose ? 0.75 : 1,
            }}>Share a Lyric</Link>

            {isSignedIn && <NotificationBell />}

            {!isSignedIn ? (
              <Link href="/signin" style={{
                fontSize: '0.65rem', fontFamily: font,
                fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase',
                textDecoration: 'none',
                color: isOnSignin ? 'var(--gold)' : 'rgba(255,255,255,0.35)',
                padding: '0 14px', marginLeft: '4px',
                minHeight: 'var(--margo-touch-min)',
                display: 'inline-flex', alignItems: 'center',
                boxSizing: 'border-box',
                transition: 'color 150ms ease', whiteSpace: 'nowrap',
              }}>Sign In</Link>
            ) : null}

            {isSignedIn && identity && ownProfileHref && (
              <div ref={avatarMenuRef} style={{ position: 'relative', marginLeft: '8px' }}>
                <button
                  type="button"
                  onClick={() => setAvatarMenuOpen(o => !o)}
                  aria-label={`${identity.displayName}'s account menu`}
                  aria-expanded={avatarMenuOpen}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 'var(--margo-touch-min)', height: 'var(--margo-touch-min)',
                    flexShrink: 0,
                    background: 'none', border: 'none',
                    boxSizing: 'border-box',
                    cursor: 'pointer', padding: 0,
                  }}
                >
                  <span style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '32px', height: '32px', borderRadius: '50%',
                    overflow: 'hidden',
                    background: identity.avatarUrl ? 'none' : 'linear-gradient(135deg, var(--gold), var(--gold-2))',
                    border: avatarMenuOpen ? '2px solid var(--gold)' : '1px solid rgba(232,197,71,0.2)',
                    boxSizing: 'border-box', transition: 'border-color 150ms ease',
                  }}>
                    {identity.avatarUrl ? (
                      <img src={identity.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontFamily: font, fontSize: '0.65rem', fontWeight: 700, color: 'var(--bg)' }}>
                        {(identity.displayName || '??').slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </span>
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
                          display: 'flex', alignItems: 'center',
                          minHeight: 'var(--margo-touch-min)',
                          fontFamily: font, fontSize: '0.8rem',
                          textDecoration: 'none',
                          color: pathname === href ? 'var(--gold)' : 'rgba(255,255,255,0.75)',
                          padding: '0 12px', borderRadius: '6px',
                          boxSizing: 'border-box',
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
                        display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left',
                        minHeight: 'var(--margo-touch-min)',
                        fontFamily: font, fontSize: '0.8rem',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'rgba(255,255,255,0.5)',
                        padding: '0 12px', borderRadius: '6px',
                        boxSizing: 'border-box',
                      }}
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .margo-desktop-nav {
          display: none;
        }
        @media (min-width: 640px) {
          .margo-desktop-nav {
            display: flex !important;
            align-items: center;
            gap: 4px;
          }
        }
      `}</style>
    </nav>
  )
}