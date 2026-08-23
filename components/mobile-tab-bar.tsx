'use client'

import Link from 'next/link'
import { useRef, useLayoutEffect, type CSSProperties } from 'react'
import { usePathname } from 'next/navigation'
import { useIdentity } from '@/hooks/useIdentity'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import { CompassIcon, PenLineIcon } from '@/components/icons'
import { HubTabButton } from '@/components/hub-menu'
import { usePrimaryTab, usePrimaryTabLinkProps } from '@/components/primary-tab-shell'
import { hidesTabBar } from '@/lib/chrome-mode'
import { useStageChromeHidden } from '@/lib/stage-chrome'

const font = 'var(--font-geist-sans), system-ui, sans-serif'

/**
 * Mobile primary tabs: Feed · Discover · Compose · Hub · You
 * (5 columns — Hub restored to bottom bar by product request.)
 */
export function MobileTabBar() {
  const pathname = usePathname()
  const { user, identity } = useIdentity()
  const { activeTab } = usePrimaryTab()
  const feedLink = usePrimaryTabLinkProps('/feed')
  const discoverLink = usePrimaryTabLinkProps('/discover')
  const composeLink = usePrimaryTabLinkProps('/compose')
  const engineState = useAudioEngine()
  const navRef = useRef<HTMLElement | null>(null)

  const shellHidden = hidesTabBar(pathname)
  const stageHidden = useStageChromeHidden()

  useLayoutEffect(() => {
    if (shellHidden || stageHidden) {
      document.documentElement.style.setProperty('--margo-tabbar-h', '0px')
      return
    }
    const el = navRef.current
    if (!el) return
    const setVar = () => {
      document.documentElement.style.setProperty('--margo-tabbar-h', `${el.offsetHeight}px`)
    }
    setVar()
    const ro = new ResizeObserver(setVar)
    ro.observe(el)
    return () => ro.disconnect()
  }, [shellHidden, stageHidden])

  const isOnFeed = activeTab === 'feed' || (!activeTab && pathname === '/feed')
  const isOnDiscover = activeTab === 'discover' || (!activeTab && !!pathname?.startsWith('/discover'))
  const isOnCompose = activeTab === 'compose' || (!activeTab && pathname === '/compose')

  const isSignedIn = !!user && !user.isAnonymous
  const ownProfileHref = identity ? `/profile/${identity.username}` : '/signin'
  const youLink = usePrimaryTabLinkProps(ownProfileHref)
  const isOnProfile = activeTab === 'you' || (isSignedIn && pathname === ownProfileHref)

  const isMusicActive = engineState.mode !== 'idle'

  const tabStyle = (active: boolean): CSSProperties => ({
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: '2px', textDecoration: 'none',
    minHeight: 'var(--margo-touch-min)',
    justifySelf: 'center',
    position: 'relative',
    color: active ? 'var(--gold)' : 'var(--text-muted)',
  })

  const labelStyle: CSSProperties = {
    fontFamily: font, fontSize: '0.6rem', fontWeight: 600,
    letterSpacing: '0.5px', textTransform: 'uppercase',
  }

  if (shellHidden || stageHidden) return null

  return (
    <nav ref={navRef} className="margo-mobile-tabbar" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      display: 'none',
      gridTemplateColumns: 'repeat(5, 1fr)',
      alignItems: 'center',
      padding: '8px 12px calc(8px + env(safe-area-inset-bottom))',
      background: 'var(--bg)',
      boxShadow: '0 -1px 24px rgba(0,0,0,0.35)',
    }}>
      <Link href="/feed" style={tabStyle(isOnFeed)} {...feedLink}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M3 9L10 3l7 6v7a1 1 0 0 1-1 1h-4v-5H8v5H4a1 1 0 0 1-1-1V9Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
        <span style={labelStyle}>Feed</span>
      </Link>

      <Link href="/discover" style={tabStyle(isOnDiscover)} {...discoverLink}>
        <CompassIcon size={20} color="currentColor" />
        <span style={labelStyle}>Discover</span>
        {isMusicActive && !isOnDiscover && (
          <span style={{
            position: 'absolute', top: '-2px', right: 'calc(50% - 14px)',
            width: '6px', height: '6px', borderRadius: '50%',
            background: 'var(--gold)',
            boxShadow: '0 0 6px rgba(232,197,71,0.7)',
          }} />
        )}
      </Link>

      <Link
        href="/compose"
        aria-label="Send a line"
        {...composeLink}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '46px', height: '46px', borderRadius: '50%',
          background: 'var(--gold)', textDecoration: 'none',
          boxShadow: '0 6px 16px var(--gold-glow), 0 0 0 1px rgba(255,255,255,0.06)',
          opacity: isOnCompose ? 0.75 : 1,
          justifySelf: 'center',
        }}
      >
        <PenLineIcon size={18} color="var(--bg)" />
      </Link>

      <HubTabButton style={tabStyle(false)} labelStyle={labelStyle} />

      <Link href={ownProfileHref} style={tabStyle(isOnProfile)} {...(isSignedIn ? youLink : {})}>
        {isSignedIn && identity?.avatarUrl ? (
          <span style={{
            width: '20px', height: '20px', borderRadius: '50%', overflow: 'hidden',
            border: isOnProfile ? '1.5px solid var(--gold)' : '1px solid rgba(255,255,255,0.25)',
          }}>
            <img src={identity.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </span>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M4 17c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
        <span style={labelStyle}>{isSignedIn ? 'You' : 'Sign In'}</span>
      </Link>

      <style>{`
        @media (max-width: 639px) {
          .margo-mobile-tabbar { display: grid !important; }
        }
      `}</style>
    </nav>
  )
}
