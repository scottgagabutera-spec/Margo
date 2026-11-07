'use client'

import Link from 'next/link'
import type { ReactNode, CSSProperties } from 'react'

type Variant = 'fill' | 'outline'

const baseClass = 'margo-cta-button'

export function MargoCtaButton({
  href,
  onClick,
  icon,
  children,
  variant = 'fill',
  className,
  style,
  'aria-label': ariaLabel,
}: {
  href?: string
  onClick?: () => void
  icon?: ReactNode
  children: ReactNode
  variant?: Variant
  className?: string
  style?: CSSProperties
  'aria-label'?: string
}) {
  const cls = [
    baseClass,
    variant === 'outline' ? `${baseClass}--outline` : `${baseClass}--fill`,
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
      <Link href={href} className={cls} style={style} aria-label={ariaLabel}>
        {inner}
      </Link>
    )
  }

  return (
    <button type="button" className={cls} style={style} onClick={onClick} aria-label={ariaLabel}>
      {inner}
    </button>
  )
}
