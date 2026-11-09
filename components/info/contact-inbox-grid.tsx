import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

type Inbox = {
  label: string
  email: string
  description: ReactNode
  icon: 'general' | 'support' | 'privacy' | 'dmca' | 'investors'
  wide?: boolean
}

function InboxIcon({ kind }: { kind: Inbox['icon'] }) {
  const paths: Record<Inbox['icon'], ReactNode> = {
    general: (
      <path
        d="M5 8c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3v-3H7a2 2 0 0 1-2-2V8z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    ),
    support: (
      <path
        d="M12 3a9 9 0 0 0-3 17.1V21h6v-.9A9 9 0 0 0 12 3z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    ),
    privacy: (
      <>
        <rect x="7" y="11" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 11V8a3 3 0 1 1 6 0v3" stroke="currentColor" strokeWidth="1.5" />
      </>
    ),
    dmca: (
      <path d="M8 7h8v2H8V7zm0 4h5v2H8v-2zm8 4H8v2h8v-2z" fill="currentColor" />
    ),
    investors: (
      <path
        d="M8 7h8v10H8V7zm2 2v2h4V9h-4zm0 4v2h4v-2h-4z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    ),
  }
  return (
    <span className="margo-help-gold-square margo-contact-card__icon" aria-hidden>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        {paths[kind]}
      </svg>
    </span>
  )
}

export function ContactInboxGrid({ inboxes }: { inboxes: Inbox[] }) {
  return (
    <div className="margo-contact-grid">
      {inboxes.map((inbox) => (
        <div
          key={inbox.label}
          className={`margo-contact-card${inbox.wide ? ' margo-contact-card--wide' : ''}`}
        >
          <InboxIcon kind={inbox.icon} />
          <p className="margo-contact-card__label">{inbox.label}</p>
          <a href={`mailto:${inbox.email}`} className="margo-contact-card__email">
            {inbox.email}
          </a>
          <div className="margo-contact-card__desc">{inbox.description}</div>
        </div>
      ))}
    </div>
  )
}

export const contactLinkClass = 'margo-info-link'

export function ContactInboxLink(props: ComponentProps<typeof Link>) {
  return <Link {...props} className="margo-info-link" />
}
