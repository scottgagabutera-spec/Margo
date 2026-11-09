'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { HelpCenterFooter } from '@/components/help-center/help-center-footer'

export type HelpContentPageShellProps = {
  title: string
  dateLine?: string
  categoryLabel?: string
  children: ReactNode
  onBack?: () => void
  closeOnBack?: boolean
}

export function HelpContentPageShell({
  title,
  dateLine,
  children,
}: HelpContentPageShellProps) {
  return (
    <div className="margo-content-page">
      <div className="margo-content-page__inner">
        <header className="margo-content-page__header">
          <h1 className="margo-content-page__title">{title}</h1>
          {dateLine ? <p className="margo-content-page__date">{dateLine}</p> : null}
        </header>
        <div className="margo-content-page__body">{children}</div>
        <HelpCenterContactCard />
        <HelpCenterFooter />
      </div>
    </div>
  )
}

export function HelpCenterContactCard() {
  return (
    <Link href="/contact" className="margo-help-contact-card">
      <span className="margo-help-gold-square margo-help-contact-card__icon" aria-hidden>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 8c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3v-3H7a2 2 0 0 1-2-2V8z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </span>
      <span className="margo-help-contact-card__copy">
        <span className="margo-help-contact-card__title">Still stuck? Contact us</span>
        <span className="margo-help-contact-card__sub">We reply in 24 to 48 hours</span>
      </span>
      <span className="margo-help-contact-card__chev" aria-hidden>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </Link>
  )
}
