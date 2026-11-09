import Link from 'next/link'
import {
  InstagramIcon,
  TikTokIcon,
  XIcon,
  YouTubeIcon,
} from '@/components/icons'
import { MARGO_SOCIAL_LINKS } from '@/lib/social-links'
import { HELP_CENTER_FOOTER_LINKS } from '@/lib/help-center/footer-links'

const FOOTER_SOCIAL = MARGO_SOCIAL_LINKS.filter((s) =>
  ['instagram', 'tiktok', 'x', 'youtube'].includes(s.id),
)

const ICONS = {
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  x: XIcon,
  youtube: YouTubeIcon,
} as const

export function HelpCenterFooter() {
  return (
    <footer className="margo-help-footer">
      <div className="margo-help-footer__links">
        {HELP_CENTER_FOOTER_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="margo-help-footer__link">
            {link.label}
          </Link>
        ))}
      </div>
      <div className="margo-help-footer__bottom">
        <div className="margo-help-footer__social">
          {FOOTER_SOCIAL.map(({ id, label, href }) => {
            const Icon = ICONS[id as keyof typeof ICONS]
            return (
              <a
                key={id}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="margo-help-footer__social-btn"
              >
                <Icon size={14} color="currentColor" />
              </a>
            )
          })}
        </div>
        <p className="margo-help-footer__copy">© 2026 Margo</p>
      </div>
    </footer>
  )
}
