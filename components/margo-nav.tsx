'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import MargoLogo from '@/components/MargoLogo'
import { useIdentity } from '@/hooks/useIdentity'
import { ProfileAccountMenu } from '@/components/profile-account-menu'
import { signOutBrowser } from '@/lib/supabase/client'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { HubIconButton, SearchNavLink } from '@/components/hub-menu'
import { LoadingRing } from '@/components/loading-ring'
import { usePrimaryTab, usePrimaryTabLinkProps } from '@/components/primary-tab-shell'
import { hidesAppNav, isMessageThreadPath } from '@/lib/chrome-mode'
import { SignInLink } from '@/components/signin-link'
import { BackButton } from '@/components/back-button'
import { navBackForPath, useNavBackOverride } from '@/components/nav-back'
import { YouTabPortrait } from '@/components/you-tab-portrait'
import { DEPTH_PAGE_TITLE, UI_FONT } from '@/lib/fonts'

const font = UI_FONT

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
  const { activeTab, barTab, isTabPending, isTabAcked } = usePrimaryTab()
  const feedLink = usePrimaryTabLinkProps('/feed', 'feed')
  const discoverLink = usePrimaryTabLinkProps('/discover', 'discover')
  const composeLink = usePrimaryTabLinkProps('/compose', 'compose')
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const avatarMenuTriggerRef = useRef<HTMLButtonElement>(null)
  const navElRef = useRef<HTMLElement>(null)
  const { user, identity } = useIdentity()
  const { rehydrate } = useAuthGate()
  const navBackOverride = useNavBackOverride()
  const pathBack = navBackForPath(pathname)
  const navBack = activeTab === 'you' ? null : (navBackOverride ?? pathBack)

  const isOnFeed = barTab === 'feed' || (barTab === null && pathname === '/feed')
  // Full lockup (mark + MARGO) only on Feed home. Landing has its own lockup.
  // Logo returns to Stage landing (`/`) — expression front door; Feed tab stays in-app home.
  // Elsewhere: mark/symbol only — tab or page context owns the destination name.
  const showWordmark = isOnFeed
  const isOnDiscover = barTab === 'discover' || (barTab === null && !!pathname?.startsWith('/discover'))
  const isOnCompose = barTab === 'compose' || (barTab === null && pathname === '/compose')
  const isOnYou =
    barTab === 'you'
    || pathname === '/you'
    || (!!identity && pathname === `/profile/${identity.username}`)
  const isOnSignin = pathname === '/signin'
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  const isLanding = pathname === '/'
  // Landing uses app top bar at ≥640px (Stage 3); phone keeps in-page landing nav + bottom tab bar.
  const isProfileRoute =
    !!pathname?.startsWith('/profile') || pathname === '/you'
  const shellHidden =
    (hidesAppNav(pathname) && !(isLanding && !isMobile)) ||
    (isMobile && isMessageThreadPath(pathname)) ||
    (isMobile && isProfileRoute)

  const isSignedIn = !!user && !user.isAnonymous
  const handleSignOut = async () => {
    setAvatarMenuOpen(false)
    await signOutBrowser()
    await rehydrate()
    router.push('/')
  }

  useEffect(() => { setAvatarMenuOpen(false) }, [pathname])

  if (shellHidden) return null

  return (
    <nav ref={navElRef} className="margo-nav-bar" style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      paddingTop: 'calc(14px + env(safe-area-inset-top, 0px))',
      paddingRight: '24px',
      paddingBottom: '14px',
      paddingLeft: '24px',
      background: 'var(--bg)',
      boxShadow: '0 1px 24px rgba(0,0,0,0.35)',
      pointerEvents: 'none',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        pointerEvents: 'none',
      }}>
        {navBack ? (
          <div style={{
            pointerEvents: 'auto',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            minWidth: 0,
          }}>
            <BackButton
              variant="chrome"
              fallbackHref={navBack.fallbackHref}
              preferHistory={navBack.preferHistory}
              replace={navBack.replace}
              onBack={navBack.onBack}
              label={navBack.label || 'Back'}
            />
            {navBack.label ? (
              <span style={{ ...DEPTH_PAGE_TITLE, whiteSpace: 'nowrap' }}>{navBack.label}</span>
            ) : null}
          </div>
        ) : (
          <Link href="/" aria-label="Margo — expression home" style={{ textDecoration: 'none', flexShrink: 0, pointerEvents: 'auto' }}>
            <MargoLogo tier="symbol" size={28} wordmark={showWordmark} rings />
          </Link>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', pointerEvents: 'none' }}>
          {isLanding ? null : (
            <div data-margo-nav-search style={{ pointerEvents: 'auto' }}><SearchNavLink /></div>
          )}

          <div style={{ display: 'none' }} className="margo-desktop-nav">
            {[
              { href: '/feed', label: 'Feed', active: isOnFeed, acked: isTabAcked('feed'), pending: isTabPending('feed'), linkProps: feedLink },
              { href: '/discover', label: 'Discover', active: isOnDiscover, acked: isTabAcked('discover'), pending: isTabPending('discover'), linkProps: discoverLink },
            ].map(({ href, label, active, acked, pending, linkProps }) => (
              <Link key={href} href={href} {...linkProps} style={{
                fontSize: '0.75rem', fontFamily: font,
                fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
                textDecoration: 'none',
                color: acked || pending || active ? 'var(--gold)' : 'rgba(255,255,255,0.5)',
                background: acked || pending ? 'var(--gold-faint)' : 'transparent',
                padding: '0 14px', position: 'relative',
                minHeight: 'var(--margo-touch-min)',
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                boxSizing: 'border-box',
                borderRadius: '8px',
                transition: 'color 80ms var(--ease-out), background 80ms var(--ease-out)',
                whiteSpace: 'nowrap',
                WebkitTapHighlightColor: 'transparent',
              }}>
                {pending ? <LoadingRing size={14} strokeWidth={1.5} state="spinning" /> : null}
                {label}
                {(active || acked) && !pending && (
                  <span
                    className="margo-nav-tab-indicator"
                    style={{
                      position: 'absolute', bottom: '2px', left: '50%',
                      transform: 'translateX(-50%)',
                      width: '18px', height: '2px',
                      background: 'var(--gold)', borderRadius: '2px',
                    }}
                  />
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
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              boxSizing: 'border-box',
              transition: 'all 150ms ease', flexShrink: 0, whiteSpace: 'nowrap',
              opacity: isTabPending('compose') || isTabAcked('compose') ? 0.9 : isOnCompose ? 0.75 : 1,
              WebkitTapHighlightColor: 'transparent',
            }}>
              {isTabPending('compose') ? <LoadingRing size={14} strokeWidth={1.5} state="spinning" color="var(--bg)" /> : null}
              Post
            </Link>

            <div style={{ marginLeft: '4px' }}>
              <HubIconButton />
            </div>

            {!isSignedIn ? (
              <SignInLink style={{
                fontSize: '0.65rem', fontFamily: font,
                fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase',
                textDecoration: 'none',
                color: isOnSignin ? 'var(--gold)' : 'rgba(255,255,255,0.35)',
                padding: '0 14px', marginLeft: '4px',
                minHeight: 'var(--margo-touch-min)',
                display: 'inline-flex', alignItems: 'center',
                boxSizing: 'border-box',
                transition: 'color 150ms ease', whiteSpace: 'nowrap',
              }}>Sign In</SignInLink>
            ) : null}

            {isSignedIn && !identity ? (
              <span
                aria-hidden
                style={{
                  marginLeft: '8px',
                  width: 'var(--margo-touch-min)',
                  height: 'var(--margo-touch-min)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <LoadingRing size={22} strokeWidth={1.5} state="spinning" />
              </span>
            ) : null}

            {isSignedIn && identity ? (
              <div className="margo-desktop-nav__avatar" style={{ position: 'relative', marginLeft: '8px' }}>
                <button
                  ref={avatarMenuTriggerRef}
                  type="button"
                  onClick={() => setAvatarMenuOpen((o) => !o)}
                  aria-label="Account menu"
                  aria-expanded={avatarMenuOpen}
                  aria-haspopup="dialog"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 'var(--margo-touch-min)', height: 'var(--margo-touch-min)',
                    flexShrink: 0,
                    background: 'none', border: 'none',
                    boxSizing: 'border-box',
                    cursor: 'pointer', padding: 0,
                  }}
                >
                  <YouTabPortrait
                    username={identity.username}
                    displayName={identity.displayName || identity.username}
                    avatarUrl={identity.avatarUrl}
                    active={isOnYou || avatarMenuOpen}
                  />
                </button>
                <ProfileAccountMenu
                  open={avatarMenuOpen}
                  onOpenChange={setAvatarMenuOpen}
                  triggerRef={avatarMenuTriggerRef}
                  showStudio={!!identity.isArtist}
                  onSignOut={handleSignOut}
                />
              </div>
            ) : null}
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
            /* Parent row is pointer-events:none so lyrics can receive taps under nav gaps;
               re-enable hits for Feed/Discover/Post/Hub/avatar in this cluster. */
            pointer-events: auto;
          }
        }
      `}</style>
    </nav>
  )
}