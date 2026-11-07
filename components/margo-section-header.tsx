'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * Gold feed/profile section header (Memories, Find your people, Favorite artists).
 */
export function MargoSectionHeader({
  title,
  actionHref,
  actionLabel = 'See all',
  action,
  className,
}: {
  title: string
  actionHref?: string
  actionLabel?: string
  action?: ReactNode
  className?: string
}) {
  const actionNode = action ?? (actionHref ? (
    <Link href={actionHref} className="margo-section-header__action">
      {actionLabel}
    </Link>
  ) : null)

  return (
    <div className={['margo-section-header', className].filter(Boolean).join(' ')}>
      <p className="margo-section-header__title">{title}</p>
      {actionNode}
    </div>
  )
}
