'use client'

import type { ComponentProps, ReactNode, CSSProperties } from 'react'
import { PendingNavLink } from '@/components/pending-nav-link'

type Variant = 'fill' | 'outline'
type Density = 'default' | 'compact'

const baseClass = 'margo-cta-button'

export function MargoCtaButton({
  href,
  onClick,
  icon,
  children,
  variant = 'fill',
  density = 'compact',
  layout = 'inline',
  className,
  style,
  'aria-label': ariaLabel,
  linkProps,
}: {
  href?: string
  onClick?: () => void
  icon?: ReactNode
  children: ReactNode
  variant?: Variant
  density?: Density
  layout?: 'inline' | 'stacked'
  className?: string
  style?: CSSProperties
  'aria-label'?: string
  linkProps?: Omit<ComponentProps<typeof PendingNavLink>, 'href' | 'children'>
}) {
  const cls = [
    baseClass,
    variant === 'outline' ? `${baseClass}--outline` : `${baseClass}--fill`,
    density === 'compact' ? `${baseClass}--compact` : '',
    layout === 'stacked' ? `${baseClass}--stacked` : '',
    className,
  ].filter(Boolean).join(' ')

  const inner = (
    <>
      {icon ? <span className={`${baseClass}__icon`} aria-hidden>{icon}</span> : null}
      <span className={`${baseClass}__label`}>{children}</span>
    </>
  )

  if (href) {
    return (
      <PendingNavLink
        href={href}
        className={cls}
        style={style}
        aria-label={ariaLabel}
        indicator="tint"
        {...linkProps}
      >
        {inner}
      </PendingNavLink>
    )
  }

  return (
    <button type="button" className={cls} style={style} onClick={onClick} aria-label={ariaLabel}>
      {inner}
    </button>
  )
}
