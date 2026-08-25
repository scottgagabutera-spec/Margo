'use client'

import MargoLogo from '@/components/MargoLogo'
import { StageLanding } from '@/components/stage/stage-landing'
import { useEffect, useState, type CSSProperties } from 'react'
import {
  InstagramIcon,
  TikTokIcon,
  XIcon,
  YouTubeIcon,
  SpotifyIcon,
} from '@/components/icons'
import { UI_FONT } from '@/lib/fonts'

const FOOTER_LINKS = [
  { label: 'Feed', href: '/feed' },
  { label: 'Discover', href: '/discover' },
  { label: 'About', href: '/about' },
  { label: 'Privacy', href: '/privacy' },
] as const

const FOOTER_SOCIAL = [
  { label: 'Instagram', href: 'https://www.instagram.com/officialtrymargo', Icon: InstagramIcon },
  { label: 'TikTok', href: 'https://www.tiktok.com/@officialtrymargo', Icon: TikTokIcon },
  { label: 'X', href: 'https://x.com/OfficialUTM', Icon: XIcon },
  { label: 'YouTube', href: 'https://youtube.com/@trymargo', Icon: YouTubeIcon },
  { label: 'Spotify', href: 'https://open.spotify.com/artist/0rGTnmN8rE5so9ibBrhTbJ', Icon: SpotifyIcon },
] as const

const footerLinkStyle: CSSProperties = {
  fontSize: '0.62rem',
  color: 'var(--text-muted)',
  fontFamily: UI_FONT,
  fontWeight: 500,
  letterSpacing: '0.4px',
  textDecoration: 'none',
  padding: '8px 6px',
  minHeight: '44px',
  display: 'inline-flex',
  alignItems: 'center',
}

export function StageLandingPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  return (
    <div style={{ position: 'relative', width: '100%', overflow: 'hidden', background: 'var(--bg)' }}>
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10rem', left: '-10rem', width: '22rem', height: '22rem', background: 'rgba(232,197,71,0.05)', borderRadius: '50%', filter: 'blur(120px)' }} />
        <div style={{ position: 'absolute', bottom: '-10rem', right: '-10rem', width: '22rem', height: '22rem', background: 'rgba(232,197,71,0.03)', borderRadius: '50%', filter: 'blur(120px)' }} />
      </div>

      <nav
        className="margo-landing-nav"
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
        }}
      >
        <a href="/" style={{ textDecoration: 'none' }}>
          <MargoLogo tier="lockup" size={36} rings wordmark />
        </a>
        <a
          href="/signin"
          style={{
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
          }}
        >
          Sign in
        </a>
      </nav>

      <section className="margo-stage-zone">
        <StageLanding />
      </section>

      <footer
        className="margo-landing-footer"
        style={{
          position: 'relative',
          zIndex: 1,
          marginTop: 'var(--stage-footer-gap)',
          padding: '0 20px calc(var(--margo-page-padding-bottom) + 20px)',
          width: '100%',
          maxWidth: '720px',
          marginLeft: 'auto',
          marginRight: 'auto',
          boxSizing: 'border-box',
        }}
      >
        <div style={{
          borderTop: '1px solid var(--border)',
          paddingTop: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '2px 4px',
            width: '100%',
          }}>
            {FOOTER_LINKS.map((link, i) => (
              <span key={link.href} style={{ display: 'inline-flex', alignItems: 'center' }}>
                {i > 0 ? <span aria-hidden style={{ color: 'var(--text-disabled)', margin: '0 2px' }}>·</span> : null}
                <a href={link.href} className="margo-landing-footer__link" style={footerLinkStyle}>{link.label}</a>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
            {FOOTER_SOCIAL.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                style={{
                  width: '40px',
                  height: '40px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  borderRadius: '50%',
                }}
              >
                <Icon size={16} color="currentColor" />
              </a>
            ))}
          </div>
          <p style={{
            margin: 0,
            fontSize: '0.62rem',
            color: 'var(--text-disabled)',
            fontFamily: UI_FONT,
            letterSpacing: '0.6px',
          }}>
            © {new Date().getFullYear()} Margo
          </p>
        </div>
      </footer>
    </div>
  )
}
