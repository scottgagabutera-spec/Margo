'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import MargoLogo from '@/components/MargoLogo'
import { useIdentity } from '@/hooks/useIdentity'
import { useArtistApplication } from '@/hooks/useArtistApplication'
import { signOutBrowser } from '@/lib/supabase/client'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { HubIconButton, LibraryNavLink } from '@/components/hub-menu'
import { usePrimaryTab, usePrimaryTabLinkProps } from '@/components/primary-tab-shell'
import { hidesAppNav, isMessageThreadPath } from '@/lib/chrome-mode'
import { PendingNavLink } from '@/components/pending-nav-link'

const font = 'var(--font-geist-sans), system-ui, sans-serif'

/**
 * Top nav. Logo + Library + Hub are always visible when signed in
 * (mobile and desktop). Hub launches Messages / Library / Notifications.
 * Text nav (Feed/Discover, Share a Lyric, avatar menu) stays
 * desktop-only; mobile primary tabs cover Feed/Discover/Compose/You.
 *
 * Account settings / Apply as artist / Sign out no longer live here
 * on mobile — they moved into the profile page itself (own-profile
 * view), since the bottom tab bar's "You" tab already lands there.
 * Having both a floating top-nav entry point AND the bottom tab both
 * lead to the same destination was redundant; now there's exactly
 * one path.
 *
 * background is set explicitly inline (var(--bg), fully opaque) rather
 * than depending on an external CSS class loading correctly — this was
 * the root cause of the nav appearing transparent with content visible
 * scrolling behind it.
 *
 * Studio (artist upload dashboard) follows the same pattern as
 * Apply as an Artist below: desktop nav shows it in the avatar
 * dropdown, gated on identity.isArtist. Mobile parity for this link
 * lives wherever Apply as an Artist lives on the own-profile page,
 * not here — same reasoning as the comment above.
 *
 * --- Aug 2, 2026 ---
 * Nav is `position: fixed`, which removes it from document flow —
 * nothing below it automatically reserves space, so any page that
 * doesn't manually pad for it will have its content overlap under
 * the nav from the very first paint (not just on scroll). Rather than
 * hardcoding a guessed pixel offset on every page that needs to clear
 * the nav (the old bug — e.g. Studio's hardcoded 100px, apply-artist's
 * missing padding entirely), the nav now measures its own real
 * rendered height at runtime via ResizeObserver and publishes it as
 * `--nav-height` on the document root. Every other page/component
 * that needs to clear the nav references `var(--nav-height)` instead
 * of guessing a number — this makes the whole class of overlap bugs
 * structurally impossible instead of something to re-fix per page.
 * A static fallback value is set below in case CSS needs it before
 * this effect runs on first client paint.
 *
 * --- Aug 3, 2026 ---
 * Music renamed to Discover (route /music → /discover) as part of the
 * row-based redesign — see MARGO_MUSIC_FEED_STATUS.md. Nav label and
 * active-state check updated below; /music itself now permanently
 * redirects to /discover via next.config.js.
 */
export function MargoNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { activeTab } = usePrimaryTab()
  const feedLink = usePrimaryTabLinkProps('/feed')
  const discoverLink = usePrimaryTabLinkProps('/discover')
  const composeLink = usePrimaryTabLinkProps('/compose')
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const avatarMenuRef = useRef<HTMLDivElement>(null)
  const navElRef = useRef<HTMLElement>(null)
  const { user, identity } = useIdentity()
  const { rehydrate } = useAuthGate()
  const { application } = useArtistApplication()

  const isOnFeed = activeTab === 'feed' || (!activeTab && pathname === '/feed')
  // Full lockup (mark + MARGO) only on Feed home. Landing has its own lockup.
  // Elsewhere: mark/symbol only — tab or page context owns the destination name.
  const showWordmark = isOnFeed
  const isOnDiscover = activeTab === 'discover' || (!activeTab && !!pathname?.startsWith('/discover'))
  const isOnCompose = activeTab === 'compose' || (!activeTab && pathname === '/compose')
  const isOnSignin = pathname === '/signin'
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  const shellHidden =
    hidesAppNav(pathname) || (isMobile && isMessageThreadPath(pathname))

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
    await signOutBrowser()
    await rehydrate()
    router.push('/feed')
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

  // Measures the nav's real rendered height (which changes across
  // breakpoints, font load, etc.) and publishes it as a CSS var on
  // the document root so any page can reliably clear the nav without
  // guessing a pixel value. Immersive/marketing modes publish 0.
  useEffect(() => {
    if (shellHidden) {
      document.documentElement.style.setProperty('--nav-height', '0px')
      return
    }
    const el = navElRef.current
    if (!el) return
    const setVar = () => {
      document.documentElement.style.setProperty('--nav-height', `${el.offsetHeight}px`)
    }
    setVar()
    const ro = new ResizeObserver(setVar)
    ro.observe(el)
    return () => ro.disconnect()
  }, [shellHidden])

  const avatarDropdownItems = ownProfileHref ? [
    { href: ownProfileHref, label: 'Profile' },
    ...(identity?.isArtist ? [{ href: '/studio', label: 'Studio' }] : []),
    { href: '/settings', label: 'Account Settings' },
    ...(showApplyCTA ? [{ href: '/apply-artist', label: applyLabel }] : []),
  ] : []

  if (shellHidden) return null

  return (
    <nav ref={navElRef} className="margo-nav-bar" style={{
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
          <MargoLogo tier="symbol" size={28} wordmark={showWordmark} rings />
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Top-bar Library for signed-in; Hub is bottom-tab on mobile, icon in desktop-nav. */}
          {isSignedIn && <LibraryNavLink />}

          <div style={{ display: 'none' }} className="margo-desktop-nav">
            {[
              { href: '/feed', label: 'Feed', active: isOnFeed, linkProps: feedLink },
              { href: '/discover', label: 'Discover', active: isOnDiscover, linkProps: discoverLink },
            ].map(({ href, label, active, linkProps }) => (
              <Link key={href} href={href} {...linkProps} style={{
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

            <Link href="/compose" {...composeLink} style={{
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
            }}>Send a line</Link>

            <div style={{ marginLeft: '4px' }}>
              <HubIconButton />
            </div>

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
                      <PendingNavLink
                        key={href}
                        href={href}
                        indicator="tint"
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
                      </PendingNavLink>
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
        :root {
          /* Fallback so nothing snaps/jumps before the ResizeObserver
             effect above runs on first client paint. Real value takes
             over immediately after mount and stays in sync on resize. */
          --nav-height: 72px;
        }
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