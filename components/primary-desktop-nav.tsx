'use client'

import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { CompassIcon, FeedIcon, PenLineIcon } from '@/components/icons'
import { HubDesktopNavButton } from '@/components/hub-menu'
import { LoadingRing } from '@/components/loading-ring'
import { SignInLink } from '@/components/signin-link'
const font = 'var(--font-geist-sans), system-ui, sans-serif'

type TabLinkProps = {
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void
  prefetch?: boolean
}

const labelStyle: CSSProperties = {
  fontFamily: font,
  fontSize: '0.6875rem',
  fontWeight: 600,
  letterSpacing: '0.35px',
  textTransform: 'uppercase',
  lineHeight: 1.1,
  whiteSpace: 'nowrap',
}

function NavItem({
  href,
  label,
  icon,
  active,
  pending,
  linkProps,
}: {
  href: string
  label: string
  icon: ReactNode
  active: boolean
  pending: boolean
  linkProps?: TabLinkProps
}) {
  return (
    <Link
      href={href}
      {...(linkProps ?? {})}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
        minWidth: 'var(--margo-touch-min)',
        minHeight: 'var(--margo-touch-min)',
        padding: '0 6px',
        textDecoration: 'none',
        color: pending || active ? 'var(--gold)' : 'rgba(255,255,255,0.55)',
        boxSizing: 'border-box',
        borderRadius: '8px',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {pending ? <LoadingRing size={18} strokeWidth={1.5} state="spinning" /> : icon}
      <span style={labelStyle}>{label}</span>
    </Link>
  )
}

export function PrimaryDesktopNav({
  isSignedIn,
  isOnFeed,
  isOnDiscover,
  isOnCompose,
  isOnProfile,
  isOnSignin,
  feedLink,
  discoverLink,
  composeLink,
  youLink,
  youHref,
  tabPending,
}: {
  isSignedIn: boolean
  isOnFeed: boolean
  isOnDiscover: boolean
  isOnCompose: boolean
  isOnProfile: boolean
  isOnSignin: boolean
  feedLink: TabLinkProps
  discoverLink: TabLinkProps
  composeLink: TabLinkProps
  youLink: TabLinkProps
  youHref: string
  tabPending: (id: 'feed' | 'discover' | 'compose' | 'you') => boolean
}) {
  return (
    <div
      className="margo-primary-desktop-nav"
      style={{
        display: 'none',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
        flex: 1,
        pointerEvents: 'auto',
      }}
    >
      <NavItem
        href="/feed"
        label="Feed"
        icon={<FeedIcon size={20} color="currentColor" />}
        active={isOnFeed}
        pending={tabPending('feed')}
        linkProps={feedLink}
      />
      <NavItem
        href="/discover"
        label="Discover"
        icon={<CompassIcon size={20} color="currentColor" />}
        active={isOnDiscover}
        pending={tabPending('discover')}
        linkProps={discoverLink}
      />
      <NavItem
        href="/compose"
        label="Compose"
        icon={<PenLineIcon size={18} color="currentColor" />}
        active={isOnCompose}
        pending={tabPending('compose')}
        linkProps={composeLink}
      />
      <HubDesktopNavButton labelStyle={labelStyle} />
      {isSignedIn ? (
        <NavItem
          href={youHref}
          label="Profile"
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M4 17c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          }
          active={isOnProfile}
          pending={tabPending('you')}
          linkProps={youLink}
        />
      ) : (
        <SignInLink
          style={{
            ...labelStyle,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
            minWidth: 'var(--margo-touch-min)',
            minHeight: 'var(--margo-touch-min)',
            padding: '0 6px',
            textDecoration: 'none',
            color: isOnSignin ? 'var(--gold)' : 'rgba(255,255,255,0.55)',
            boxSizing: 'border-box',
            borderRadius: '8px',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
            <path d="M4 17c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span style={labelStyle}>Sign in</span>
        </SignInLink>
      )}
      <style>{`
        @media (min-width: 640px) {
          .margo-primary-desktop-nav { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
