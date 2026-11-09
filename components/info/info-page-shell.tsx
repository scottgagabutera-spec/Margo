'use client'

import type { ReactNode } from 'react'
import { HelpCenterFooter } from '@/components/help-center/help-center-footer'

type Props = {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: boolean
}

export function InfoPageShell({ title, subtitle, children, footer = true }: Props) {
  return (
    <div className="margo-content-page">
      <div className="margo-content-page__inner">
        <header className="margo-content-page__header">
          <h1 className="margo-content-page__title">{title}</h1>
          {subtitle ? <p className="margo-content-page__date">{subtitle}</p> : null}
        </header>
        <div className="margo-info-prose">{children}</div>
        {footer ? <HelpCenterFooter /> : null}
      </div>
    </div>
  )
}
