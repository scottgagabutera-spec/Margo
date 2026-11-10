'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { usePathname } from 'next/navigation'
import { useIdentity } from '@/hooks/useIdentity'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import { CompassIcon, FeedIcon, PenLineIcon } from '@/components/icons'
import { HubTabButton, useHub } from '@/components/hub-menu'
import { LoadingRing } from '@/components/loading-ring'
import { usePrimaryTab, usePrimaryTabLinkProps } from '@/components/primary-tab-shell'
import { hidesTabBar } from '@/lib/chrome-mode'
import { useStageChromeHidden } from '@/lib/stage-chrome'
import { SignInLink, useSigninHref } from '@/components/signin-link'
import { persistAuthReturnScroll } from '@/lib/auth-return'
import { persistActivePrimaryScroll } from '@/components/primary-tab-shell'
import { YouTabPortrait } from '@/components/you-tab-portrait'
import { signInTabActiveOnSigninRoute } from '@/lib/mobile-tab-signin-active'
import {
  hubTabBarGold,
  primaryTabBarGold,
  primaryTabBarLive,
} from '@/lib/mobile-tab-bar-highlight'
import {
  primaryTabBarRouteActive,
  resolvePrimaryTabBarSelection,
} from '@/lib/primary-tab-bar-selection'

const font = 'var(--font-geist-sans), system-ui, sans-serif'

/**
 * Mobile primary tabs: Feed · Discover · Compose · Hub · You
 * (5 columns — Hub restored to bottom bar by product request.)
 */
export function MobileTabBar() {
  const pathname = usePathname()
  const { user, identity } = useIdentity()
  const {
    selectionTab,
    paintedTab,
    ackedTab,
    routeTab,
    isTabPending,
    isTabAcked,
  } = usePrimaryTab()
  const { open: hubOpen } = useHub()
  const feedLink = usePrimaryTabLinkProps('/feed', 'feed')
  const discoverLink = usePrimaryTabLinkProps('/discover', 'discover')
  const composeLink = usePrimaryTabLinkProps('/compose', 'compose')
  const engineState = useAudioEngine()
  const navRef = useRef<HTMLElement | null>(null)

  const [libraryPlayerOpen, setLibraryPlayerOpen] = useState(false)
  const [mobilePrimaryChrome, setMobilePrimaryChrome] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 639px)')
    const apply = () => setMobilePrimaryChrome(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
  useEffect(() => {
    const sync = () => {
      setLibraryPlayerOpen(document.documentElement.hasAttribute('data-margo-library-player'))
    }
    sync()
    const mo = new MutationObserver(sync)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-margo-library-player'] })
    return () => mo.disconnect()
  }, [])

  const shellHidden = hidesTabBar(pathname, { mobilePrimaryChrome }) || libraryPlayerOpen
  const stageHidden = useStageChromeHidden()
  const isLanding = pathname === '/'

  const ownProfilePath = identity?.username ? `/profile/${identity.username}` : null
  const coreSelection =
    selectionTab
    ?? resolvePrimaryTabBarSelection({
      hubOpen: false,
      paintedTab,
      ackedTab,
      routeTab,
    })
  const barSelection = hubOpen ? null : coreSelection
  const routeActive = (id: 'feed' | 'discover' | 'compose' | 'you') =>
    primaryTabBarRouteActive(barSelection, id, pathname?.split('?')[0] ?? '', ownProfilePath)
  const isOnFeed = primaryTabBarGold(hubOpen, routeActive('feed'))
  const isOnDiscover = primaryTabBarGold(hubOpen, routeActive('discover'))
  const isOnCompose = primaryTabBarGold(hubOpen, routeActive('compose'))

  const isSignedIn = !!user && !user.isAnonymous
  const signinHref = useSigninHref()
  const youHref = isSignedIn ? '/you' : signinHref
  const youLink = usePrimaryTabLinkProps(youHref, 'you')
  const isOnProfile = primaryTabBarGold(hubOpen, routeActive('you'))
  const onSigninPath = pathname?.split('?')[0] === '/signin'
  const isOnSignInRoute = !isSignedIn && onSigninPath
  const primaryBarSelected = barSelection !== null
  const signInTabActive = signInTabActiveOnSigninRoute(isOnSignInRoute, hubOpen, primaryBarSelected)
  const youAwaitingIdentity = isSignedIn && !identity && barSelection !== 'you'

  const isMusicActive = engineState.mode !== 'idle'

  const tabPending = (id: 'feed' | 'discover' | 'compose' | 'you') => isTabPending(id)
  const tabAcked = (id: 'feed' | 'discover' | 'compose' | 'you') => isTabAcked(id)
  const tabLive = (id: 'feed' | 'discover' | 'compose' | 'you') =>
    primaryTabBarLive(hubOpen, tabPending(id) || tabAcked(id))
  const hubGold = hubTabBarGold(hubOpen)

  const tabStyle = (active: boolean, live: boolean): CSSProperties => ({
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: '2px', textDecoration: 'none',
    minHeight: 'var(--margo-touch-min)',
    justifySelf: 'center',
    position: 'relative',
    color: live || active ? 'var(--gold)' : 'var(--text-muted)',
    WebkitTapHighlightColor: 'transparent',
    transition: 'opacity 80ms var(--ease-out)',
  })

  const tabIndicator = (visible: boolean) => visible ? (
    <span
      aria-hidden
      className="margo-mobile-tab-indicator"
      style={{
        position: 'absolute',
        bottom: '2px',
        left: '50%',
        width: 20,
        height: 2,
        borderRadius: 2,
        background: 'var(--gold)',
        transform: 'translateX(-50%) scaleX(1)',
        opacity: 1,
        transition: 'opacity 120ms var(--ease-out), transform 160ms var(--ease-out)',
      }}
    />
  ) : null

  const labelStyle: CSSProperties = {
    fontFamily: font,
    fontSize: 'var(--margo-tab-label-size)',
    fontWeight: 500,
    letterSpacing: 0,
    textTransform: 'none',
    whiteSpace: 'nowrap',
    lineHeight: 1.1,
    maxWidth: '100%',
  }

  if (shellHidden || stageHidden) return null

  return (
    <nav
      ref={navRef}
      data-margo-tab-selection={barSelection ?? ''}
      className={'margo-mobile-tabbar' + (isLanding ? ' margo-mobile-tabbar--landing' : '')}
      style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      display: 'none',
      gridTemplateColumns: 'repeat(5, 1fr)',
      alignItems: 'center',
      padding: '8px 12px calc(8px + env(safe-area-inset-bottom))',
      background: 'var(--bg)',
      boxShadow: isLanding ? 'none' : '0 -1px 24px rgba(0,0,0,0.35)',
      borderTop: isLanding ? '1px solid var(--border)' : 'none',
    }}>
      <Link href="/feed" style={tabStyle(isOnFeed, tabLive('feed'))} {...feedLink}>
        {tabPending('feed') ? (
          <LoadingRing size={20} strokeWidth={1.5} state="spinning" />
        ) : (
          <FeedIcon size={20} color="currentColor" />
        )}
        <span style={labelStyle}>Feed</span>
        {tabIndicator((isOnFeed || tabAcked('feed')) && !tabPending('feed'))}
      </Link>

      <Link href="/discover" style={tabStyle(isOnDiscover, tabLive('discover'))} {...discoverLink}>
        {tabPending('discover') ? (
          <LoadingRing size={20} strokeWidth={1.5} state="spinning" />
        ) : (
          <CompassIcon size={20} color="currentColor" />
        )}
        <span style={labelStyle}>Discover</span>
        {tabIndicator((isOnDiscover || tabAcked('discover')) && !tabPending('discover'))}
        {isMusicActive && !hubOpen && !routeActive('discover') && (
          <span
            className="margo-signal-dot margo-signal-dot--sm"
            style={{
              position: 'absolute',
              top: '-2px',
              right: 'calc(50% - 14px)',
              boxShadow: 'none',
            }}
          />
        )}
      </Link>

      <Link
        href="/compose"
        aria-label="Post"
        {...composeLink}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '46px', height: '46px', borderRadius: '50%',
          background: 'var(--gold)', textDecoration: 'none',
          boxShadow: '0 6px 16px var(--gold-glow), 0 0 0 1px rgba(255,255,255,0.06)',
          opacity: tabPending('compose') || tabAcked('compose') ? 0.85 : isOnCompose ? 0.75 : 1,
          justifySelf: 'center',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
          {tabPending('compose') ? (
          <LoadingRing size={22} strokeWidth={1.5} state="spinning" color="var(--bg)" />
        ) : (
          <PenLineIcon size={18} color="var(--bg)" />
        )}
      </Link>

      <HubTabButton style={tabStyle(hubGold, hubGold)} labelStyle={labelStyle} hubIndicator={hubGold} />

      {isSignedIn ? (
        <Link
          href={youHref}
          aria-label="You"
          style={tabStyle(isOnProfile, tabLive('you') || youAwaitingIdentity)}
          {...youLink}
        >
          {tabPending('you') || youAwaitingIdentity ? (
            <LoadingRing size={20} strokeWidth={1.5} state="spinning" />
          ) : identity ? (
            <YouTabPortrait
              username={identity.username}
              displayName={identity.displayName || identity.username}
              avatarUrl={identity.avatarUrl}
              active={isOnProfile}
            />
          ) : null}
          {tabIndicator((isOnProfile || tabAcked('you')) && !tabPending('you'))}
        </Link>
      ) : (
        <SignInLink
          style={tabStyle(signInTabActive, tabLive('you') || youAwaitingIdentity)}
          aria-current={signInTabActive ? 'page' : undefined}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M4 17c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span style={labelStyle}>Sign In</span>
          {tabIndicator(signInTabActive && !tabPending('you'))}
        </SignInLink>
      )}

      <style>{`
        @media (max-width: 639px) {
          .margo-mobile-tabbar { display: grid !important; }
        }
        .margo-mobile-tabbar a:active:not([aria-label="Post"]) {
          color: var(--gold);
        }
        .margo-mobile-tabbar--landing a:not([aria-label="Post"]) {
          color: var(--text-muted);
        }
        .margo-mobile-tabbar--landing a[aria-label="Post"] {
          box-shadow: 0 2px 10px var(--gold-glow);
        }
        .margo-mobile-tabbar[data-margo-tab-selection="feed"] a[href="/feed"],
        .margo-mobile-tabbar[data-margo-tab-selection="feed"] a[href="/feed"] span,
        .margo-mobile-tabbar[data-margo-tab-selection="discover"] a[href="/discover"],
        .margo-mobile-tabbar[data-margo-tab-selection="discover"] a[href="/discover"] span,
        .margo-mobile-tabbar[data-margo-tab-selection="compose"] a[href="/compose"],
        .margo-mobile-tabbar[data-margo-tab-selection="compose"] a[href="/compose"] span,
        .margo-mobile-tabbar[data-margo-tab-selection="you"] a[href="/you"],
        .margo-mobile-tabbar[data-margo-tab-selection="you"] a[href="/you"] span {
          color: var(--gold) !important;
        }
      `}</style>
    </nav>
  )
}
