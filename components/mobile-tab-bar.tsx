'use client'
import { useRef, useLayoutEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useIdentity } from '@/hooks/useIdentity'
import { useNotifications } from '@/hooks/useNotifications'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import { CompassIcon } from '@/components/icons'
import { primaryTabWarmProps } from '@/lib/primary-tab-warm'
import { hidesAppShell } from '@/lib/chrome-mode'

const font = 'var(--font-geist-sans), system-ui, sans-serif'

export function MobileTabBar() {
  const pathname = usePathname()
  const { user, identity } = useIdentity()
  const { unreadCount } = useNotifications()
  const engineState = useAudioEngine()
  const navRef = useRef<HTMLElement | null>(null)

  const shellHidden = hidesAppShell(pathname)

  // Publish our real rendered height as a CSS var so anything else that
  // stacks above the bottom of the screen (e.g. MiniPlayer) can position
  // itself relative to us instead of guessing a fixed pixel value.
  // On desktop this bar is display:none, so offsetHeight is 0 and the
  // var naturally falls back to 0 — no separate desktop/mobile branching needed.
  // Immersive/marketing modes hide the bar and publish 0.
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
  const isOnNotifications = pathname === '/notifications'

  const isSignedIn = !!user && !user.isAnonymous
  const ownProfileHref = identity ? `/profile/${identity.username}` : '/signin'
  const isOnProfile = isSignedIn && pathname === ownProfileHref

  const isMusicActive = engineState.mode !== 'idle'

  const tabStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: '2px', textDecoration: 'none',
    minHeight: 'var(--margo-touch-min)',
    justifySelf: 'center',
    position: 'relative',
    color: active ? 'var(--gold)' : 'var(--text-muted)',
  })

  const labelStyle: React.CSSProperties = {
    fontFamily: font, fontSize: '0.6rem', fontWeight: 600,
    letterSpacing: '0.5px', textTransform: 'uppercase',
  }

  if (shellHidden) return null

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

      <Link href="/notifications" style={tabStyle(isOnNotifications)} {...primaryTabWarmProps('/notifications')}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M5 8a5 5 0 0 1 10 0c0 3 1 4.5 1.5 5.2.3.4 0 .8-.5.8H4c-.5 0-.8-.4-.5-.8C4 12.5 5 11 5 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M8 16a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span style={labelStyle}>Alerts</span>
        {isSignedIn && unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '-2px', right: 'calc(50% - 16px)',
            minWidth: '14px', height: '14px', borderRadius: '50%',
            background: 'var(--gold)', color: 'var(--bg)',
            fontFamily: font, fontSize: '0.45rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px', boxSizing: 'border-box',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
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