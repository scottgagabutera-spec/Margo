'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import MargoLogo from '@/components/MargoLogo'
import { useIdentity } from '@/hooks/useIdentity'
import { usePrimaryTab, usePrimaryTabLinkProps } from '@/components/primary-tab-shell'
import { hidesAppNav, isMessageThreadPath } from '@/lib/chrome-mode'
import { SearchNavLink } from '@/components/hub-menu'
import { PrimaryDesktopNav } from '@/components/primary-desktop-nav'
import { useSigninHref } from '@/components/signin-link'
import { BackButton } from '@/components/back-button'
import { navBackForPath, useNavBackOverride } from '@/components/nav-back'

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
  const { activeTab, isTabPending } = usePrimaryTab()
  const feedLink = usePrimaryTabLinkProps('/feed', 'feed')
  const discoverLink = usePrimaryTabLinkProps('/discover', 'discover')
  const composeLink = usePrimaryTabLinkProps('/compose', 'compose')
  const youLink = usePrimaryTabLinkProps('/you', 'you')
  const navElRef = useRef<HTMLElement>(null)
  const { user, identity } = useIdentity()
  const signinHref = useSigninHref()
  const navBackOverride = useNavBackOverride()
  const pathBack = navBackForPath(pathname)
  const navBack = activeTab === 'you' ? null : (navBackOverride ?? pathBack)

  const isLanding = pathname === '/'
  const isOnFeed = activeTab === 'feed' || (!activeTab && pathname === '/feed')
  const showWordmark = isOnFeed || isLanding
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
    (hidesAppNav(pathname) && !(isLanding && !isMobile)) ||
    (isMobile && isMessageThreadPath(pathname))

  const isSignedIn = !!user && !user.isAnonymous
  const youHref = isSignedIn ? '/you' : signinHref
  const isOnProfile =
    activeTab === 'you' ||
    pathname === '/you' ||
    (!!identity && isSignedIn && pathname === `/profile/${identity.username}`)

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
          <div style={{ pointerEvents: 'auto', flexShrink: 0 }}>
            <BackButton
              variant="chrome"
              fallbackHref={navBack.fallbackHref}
              preferHistory={navBack.preferHistory}
              replace={navBack.replace}
              onBack={navBack.onBack}
              label={navBack.label || 'Back'}
            />
          </div>
        ) : (
          <Link href="/" aria-label="Margo — expression home" style={{ textDecoration: 'none', flexShrink: 0, pointerEvents: 'auto' }}>
            <MargoLogo tier="symbol" size={28} wordmark={showWordmark} rings />
          </Link>
        )}

        <PrimaryDesktopNav
          isSignedIn={isSignedIn}
          isOnFeed={isOnFeed}
          isOnDiscover={isOnDiscover}
          isOnCompose={isOnCompose}
          isOnProfile={isOnProfile}
          isOnSignin={isOnSignin}
          feedLink={feedLink}
          discoverLink={discoverLink}
          composeLink={composeLink}
          youLink={youLink}
          youHref={youHref}
          tabPending={isTabPending}
        />
        <div style={{ pointerEvents: 'auto', flexShrink: 0 }}>
          <SearchNavLink />
        </div>
      </div>

      <style>{`
        :root {
          --nav-height: 72px;
        }
        .margo-nav-bar a:focus-visible,
        .margo-nav-bar button:focus-visible {
          outline: 2px solid var(--gold);
          outline-offset: 2px;
        }
      `}</style>
    </nav>
  )
}