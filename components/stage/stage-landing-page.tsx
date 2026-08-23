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

const FOOTER_EXPLORE = [
  { label: 'Feed', href: '/feed' },
  { label: 'Discover', href: '/discover' },
  { label: 'Songs', href: '/discover/songs' },
] as const

const FOOTER_TALK = [
  { label: 'Send a line', href: '/compose' },
] as const

const FOOTER_ARTISTS = [
  { label: 'Artists', href: '/artists' },
  { label: 'Apply', href: '/apply-artist' },
] as const

const FOOTER_SUPPORT = [
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
] as const

const FOOTER_LEGAL_BAR = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'DMCA', href: '/dmca' },
] as const

const FOOTER_SOCIAL = [
  { label: 'Instagram', href: 'https://www.instagram.com/officialtrymargo', Icon: InstagramIcon },
  { label: 'TikTok', href: 'https://www.tiktok.com/@officialtrymargo', Icon: TikTokIcon },
  { label: 'X', href: 'https://x.com/OfficialUTM', Icon: XIcon },
  { label: 'YouTube', href: 'https://youtube.com/@trymargo', Icon: YouTubeIcon },
] as const

const FOOTER_LISTEN = [
  { label: 'Spotify', href: 'https://open.spotify.com/artist/0rGTnmN8rE5so9ibBrhTbJ', Icon: SpotifyIcon },
] as const

const footerLinkStyle: CSSProperties = {
  fontSize: '0.65rem',
  color: 'var(--text)',
  fontFamily: UI_FONT,
  fontWeight: 600,
  letterSpacing: '0.3px',
  textDecoration: 'none',
  padding: '0 2px',
  minHeight: 'unset',
  display: 'inline-flex',
  alignItems: 'center',
  boxSizing: 'border-box',
  lineHeight: 1.3,
  position: 'relative',
}

const footerBarLinkStyle: CSSProperties = {
  fontSize: '0.65rem',
  color: 'var(--text-muted)',
  fontFamily: UI_FONT,
  fontWeight: 500,
  letterSpacing: '0.5px',
  textDecoration: 'none',
  padding: '8px 4px',
  minHeight: '44px',
  display: 'inline-flex',
  alignItems: 'center',
  boxSizing: 'border-box',
}

const footerColLabelStyle: CSSProperties = {
  fontSize: '0.55rem',
  fontFamily: UI_FONT,
  fontWeight: 700,
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: 'var(--gold)',
  marginBottom: '10px',
  lineHeight: 1.3,
}

const footerIconLinkStyle: CSSProperties = {
  width: 'var(--margo-touch-min)',
  height: 'var(--margo-touch-min)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--text-secondary)',
  textDecoration: 'none',
  borderRadius: '50%',
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

      <section
        style={{
          position: 'relative',
          zIndex: 5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '32px 24px 48px',
          maxWidth: '56rem',
          margin: '0 auto',
        }}
      >
        <StageLanding />
      </section>

      <footer
        className="margo-landing-footer"
        style={{
          position: 'relative',
          zIndex: 10,
          padding: '24px 24px calc(var(--margo-page-padding-bottom) + 32px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: '32px',
          width: '100%',
          maxWidth: '1100px',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        <style>{`
          .margo-landing-footer__product {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 28px 24px;
            width: 100%;
          }
          .margo-landing-footer__col {
            display: flex;
            flex-direction: column;
            gap: 10px;
            align-items: flex-start;
            min-width: 0;
          }
          .margo-landing-footer__link { position: relative; }
          .margo-landing-footer__link::before {
            content: '';
            position: absolute;
            top: 50%;
            left: -4px;
            right: -4px;
            height: 44px;
            transform: translateY(-50%);
          }
          .margo-landing-footer__connect {
            display: grid;
            grid-template-columns: minmax(200px, 1.65fr) minmax(0, 0.85fr);
            gap: 20px 24px;
            width: 100%;
            grid-column: 1 / -1;
          }
          .margo-landing-footer__connect-block {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
            min-width: 0;
          }
          .margo-landing-footer__icons {
            display: flex;
            flex-wrap: nowrap;
            gap: 4px;
            justify-content: flex-start;
            align-items: center;
          }
          .margo-landing-footer__copy {
            text-align: left;
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding-top: 16px;
            border-top: 1px solid var(--border);
          }
          .margo-landing-footer__legal {
            display: flex;
            flex-wrap: wrap;
            gap: 4px 8px;
            align-items: center;
          }
          @media (min-width: 640px) {
            .margo-landing-footer {
              padding-left: 48px !important;
              padding-right: 48px !important;
            }
            .margo-landing-footer__product {
              grid-template-columns: repeat(4, minmax(0, 1fr)) minmax(200px, 1.15fr);
              gap: 32px 40px;
            }
            .margo-landing-footer__connect {
              grid-column: auto;
              display: flex;
              flex-direction: column;
              gap: 20px;
            }
          }
        `}</style>
        <div className="margo-landing-footer__product">
          <div className="margo-landing-footer__col">
            <div className="margo-landing-footer__col-label" style={footerColLabelStyle}>Explore</div>
            {FOOTER_EXPLORE.map((link) => (
              <a key={link.href} href={link.href} className="margo-landing-footer__link" style={footerLinkStyle}>{link.label}</a>
            ))}
          </div>
          <div className="margo-landing-footer__col">
            <div className="margo-landing-footer__col-label" style={footerColLabelStyle}>Talk in Lyrics</div>
            {FOOTER_TALK.map((link) => (
              <a key={link.href} href={link.href} className="margo-landing-footer__link" style={footerLinkStyle}>{link.label}</a>
            ))}
          </div>
          <div className="margo-landing-footer__col">
            <div className="margo-landing-footer__col-label" style={footerColLabelStyle}>For Artists</div>
            {FOOTER_ARTISTS.map((link) => (
              <a key={link.href} href={link.href} className="margo-landing-footer__link" style={footerLinkStyle}>{link.label}</a>
            ))}
          </div>
          <div className="margo-landing-footer__col">
            <div className="margo-landing-footer__col-label" style={footerColLabelStyle}>Support</div>
            {FOOTER_SUPPORT.map((link) => (
              <a key={link.href} href={link.href} className="margo-landing-footer__link" style={footerLinkStyle}>{link.label}</a>
            ))}
          </div>
          <div className="margo-landing-footer__connect">
            <div className="margo-landing-footer__connect-block">
              <div className="margo-landing-footer__col-label" style={footerColLabelStyle}>Social</div>
              <div className="margo-landing-footer__icons">
                {FOOTER_SOCIAL.map(({ label, href, Icon }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} style={footerIconLinkStyle}>
                    <Icon size={18} color="currentColor" />
                  </a>
                ))}
              </div>
            </div>
            <div className="margo-landing-footer__connect-block">
              <div className="margo-landing-footer__col-label" style={footerColLabelStyle}>Listen</div>
              <div className="margo-landing-footer__icons">
                {FOOTER_LISTEN.map(({ label, href, Icon }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} style={footerIconLinkStyle}>
                    <Icon size={18} color="currentColor" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="margo-landing-footer__copy">
          <div className="margo-landing-footer__legal">
            {FOOTER_LEGAL_BAR.map((link, i) => (
              <span key={link.href} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                {i > 0 ? <span aria-hidden="true" style={{ color: 'var(--text-disabled)' }}>·</span> : null}
                <a href={link.href} style={footerBarLinkStyle}>{link.label}</a>
              </span>
            ))}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: UI_FONT, letterSpacing: '1px' }}>
            © {new Date().getFullYear()} Margo
          </div>
        </div>
      </footer>
    </div>
  )
}
