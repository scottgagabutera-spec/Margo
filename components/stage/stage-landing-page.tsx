'use client'

import MargoLogo from '@/components/MargoLogo'
import { StageLanding } from '@/components/stage/stage-landing'
import Link from 'next/link'
import { SignInLink } from '@/components/signin-link'
import { UI_FONT } from '@/lib/fonts'
import { useIdentity } from '@/hooks/useIdentity'
import { MargoFooter } from '@/components/footer/margo-footer'
import type { CSSProperties } from 'react'

const landingAccountLinkStyle: CSSProperties = {
  fontFamily: UI_FONT,
  fontSize: '0.72rem',
  fontWeight: 600,
  letterSpacing: '0.5px',
  color: 'var(--text-secondary)',
  textDecoration: 'none',
  padding: '8px 12px',
  minHeight: 'var(--margo-touch-min)',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
}

export function StageLandingPage() {
  const { user, identity } = useIdentity()

  const isSignedIn = !!user && !user.isAnonymous
  const profileHref = identity ? `/profile/${identity.username}` : '/feed'

  return (
    <div className="margo-landing-page-shell">
      <nav className="margo-landing-nav">
        <a href="/" style={{ display: 'inline-flex', overflow: 'visible', textDecoration: 'none' }}>
          <MargoLogo tier="lockup" size={36} rings glow={false} />
        </a>
        <div className="margo-landing-nav__account">
          {isSignedIn ? (
            <Link href={profileHref} style={landingAccountLinkStyle}>
              {identity?.avatarUrl ? (
                <img
                  src={identity.avatarUrl}
                  alt=""
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                />
              ) : (
                <span
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, var(--gold), var(--gold-2))',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    color: 'var(--bg)',
                  }}
                >
                  {(identity?.displayName || identity?.username || '??').slice(0, 2).toUpperCase()}
                </span>
              )}
              <span>You</span>
            </Link>
          ) : (
            <SignInLink style={landingAccountLinkStyle}>
              Sign in
            </SignInLink>
          )}
        </div>
      </nav>

      <div className="margo-landing-hero-anchor">
        <section className="margo-stage-zone">
          <StageLanding />
        </section>
      </div>

      <MargoFooter />
    </div>
  )
}
