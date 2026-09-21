'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { LoadingRing } from '@/components/loading-ring'

type PendingNavLinkProps = ComponentProps<typeof Link> & {
  /** overlay = gold wash + spinner (tiles/rows). tint = gold fill, no spinner (chips). subtle = opacity only (inline text). */
  indicator?: 'overlay' | 'tint' | 'subtle'
  ringSize?: number
}

/**
 * Next.js Link with instant tap feedback while the destination RSC loads.
 * Extra taps are ignored until pathname changes.
 */
export function PendingNavLink({
  href,
  children,
  style,
  onClick,
  indicator = 'overlay',
  ringSize = 28,
  ...rest
}: PendingNavLinkProps) {
  const pathname = usePathname()
  const [pending, setPending] = useState(false)
  const [pressed, setPressed] = useState(false)
  const pendingRef = useRef(false)

  useEffect(() => {
    pendingRef.current = false
    setPending(false)
  }, [pathname])

  const baseStyle = typeof style === 'object' && style ? style : {}

  return (
    <Link
      href={href}
      {...rest}
      aria-busy={pending}
      onPointerDown={(e) => {
        if (indicator === 'subtle') setPressed(true)
      }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onClick={(e) => {
        onClick?.(e)
        if (e.defaultPrevented) return
        if (pendingRef.current) {
          e.preventDefault()
          return
        }
        pendingRef.current = true
        setPending(true)
        if (indicator === 'subtle') setPressed(false)
      }}
      style={{
        position: 'relative',
        ...baseStyle,
        ...(pending && indicator === 'tint'
          ? { background: 'var(--gold-faint)', color: 'var(--gold)' }
          : {}),
        ...(indicator === 'subtle' && pressed ? { opacity: 0.68 } : {}),
        ...(indicator === 'subtle' ? { WebkitTapHighlightColor: 'transparent' } : {}),
        transition:
          'background 80ms var(--ease-out), color 80ms var(--ease-out), opacity 80ms var(--ease-out)',
      }}
    >
      {children}
      {pending && indicator === 'overlay' ? (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'color-mix(in srgb, var(--gold) 16%, var(--bg))',
            pointerEvents: 'none',
            borderRadius: 'inherit',
            zIndex: 3,
          }}
        >
          <LoadingRing size={ringSize} strokeWidth={2} state="spinning" />
        </span>
      ) : null}
    </Link>
  )
}
