'use client'

import Link from 'next/link'
import { useRef, useLayoutEffect, type CSSProperties } from 'react'
import { usePathname } from 'next/navigation'
import { useIdentity } from '@/hooks/useIdentity'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import { CompassIcon } from '@/components/icons'
import { primaryTabWarmProps } from '@/lib/primary-tab-warm'
import { hidesTabBar } from '@/lib/chrome-mode'

const font = 'var(--font-geist-sans), system-ui, sans-serif'

/** Mobile primary tabs: Feed · Discover · Compose · You (Alerts absorbed into Hub). */
export function MobileTabBar() {
  const pathname = usePathname()
  const { user, identity } = useIdentity()
  const engineState = useAudioEngine()
  const navRef = useRef<HTMLElement | null>(null)

  const shellHidden = hidesTabBar(pathname)

  useLayoutEffect(() => {
    if (shellHidden) {
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
  }, [shellHidden])

  const isOnFeed = pathname === '/feed'
  const isOnDiscover = pathname?.startsWith('/discover')
  const isOnCompose = pathname === '/compose'

  const isSignedIn = !!user && !user.isAnonymous
  const ownProfileHref = identity ? `/profile/${identity.username}` : '/signin'
  const isOnProfile = isSignedIn && pathname === ownProfileHref

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

  if (shellHidden) return null

  return (
    <nav ref={navRef} className="margo-mobile-tabbar" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      display: 'none',
      gridTemplateColumns: 'repeat(4, 1fr)',
      alignItems: 'center',
      padding: '8px 12px calc(8px + env(safe-area-inset-bottom))',
      background: 'var(--bg)',
      boxShadow: '0 -1px 24px rgba(0,0,0,0.35)',
    }}>
      <Link href="/feed" style={tabStyle(isOnFeed)} {...primaryTabWarmProps('/feed')}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M3 9L10 3l7 6v7a1 1 0 0 1-1 1h-4v-5H8v5H4a1 1 0 0 1-1-1V9Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
        <span style={labelStyle}>Feed</span>
      </Link>

      <Link href="/discover" style={tabStyle(isOnDiscover)} {...primaryTabWarmProps('/discover')}>
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
        aria-label="Share a lyric"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '46px', height: '46px', borderRadius: '50%',
          background: 'var(--gold)', textDecoration: 'none',
          boxShadow: '0 6px 16px var(--gold-glow), 0 0 0 1px rgba(255,255,255,0.06)',
          opacity: isOnCompose ? 0.75 : 1,
          justifySelf: 'center',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
          <path d="M7 1v12M1 7h12" stroke="var(--bg)" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </Link>

      <Link href={ownProfileHref} style={tabStyle(isOnProfile)}>
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
