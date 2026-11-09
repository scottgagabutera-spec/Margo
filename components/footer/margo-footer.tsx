'use client'

import Link from 'next/link'
import {
  InstagramIcon,
  FacebookIcon,
  TikTokIcon,
  XIcon,
  YouTubeIcon,
  SpotifyIcon,
} from '@/components/icons'
import { MARGO_SOCIAL_LINKS } from '@/lib/social-links'
import { MARGO_FOOTER_SECTIONS } from '@/components/footer/margo-footer-links'

const SOCIAL_ICONS = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  tiktok: TikTokIcon,
  x: XIcon,
  youtube: YouTubeIcon,
  spotify: SpotifyIcon,
} as const

function CopyrightLine() {
  return (
    <p className="margo-footer__copyright">
      © {new Date().getFullYear()} Margo
    </p>
  )
}

function SocialButtonRow({ className }: { className?: string }) {
  return (
    <div className={`margo-footer__social-row${className ? ` ${className}` : ''}`}>
      {MARGO_SOCIAL_LINKS.map(({ id, label, href }) => {
        const Icon = SOCIAL_ICONS[id]
        return (
          <a
            key={id}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="margo-footer__social-btn"
          >
            <Icon size={14} color="currentColor" />
          </a>
        )
      })}
    </div>
  )
}

function FooterLinkSections() {
  return (
    <>
      {MARGO_FOOTER_SECTIONS.map((section) => (
        <div key={section.id} className="margo-footer__sheet-section">
          <span className="margo-footer__section-label">{section.label}</span>
          <div className="margo-footer__section-links">
            {section.links.map((link) => (
              <Link key={link.href} href={link.href} className="margo-footer__section-link">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

/** Landing footer — links, social, and copyright (no expandable sheet). */
export function MargoFooter() {
  return (
    <footer className="margo-footer margo-footer--static" aria-label="Site footer">
      <div className="margo-footer__static-inner">
        <FooterLinkSections />
        <SocialButtonRow />
        <CopyrightLine />
      </div>
    </footer>
  )
}
