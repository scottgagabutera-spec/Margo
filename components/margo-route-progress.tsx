'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { MARGO_NAV_END, MARGO_NAV_START } from '@/lib/margo-nav-intent'

/**
 * Slim top progress line during route transitions. No delay to navigation.
 */
export function MargoRouteProgress() {
  const pathname = usePathname()
  const [active, setActive] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduceMotion(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const onStart = () => setActive(true)
    window.addEventListener(MARGO_NAV_START, onStart)
    return () => window.removeEventListener(MARGO_NAV_START, onStart)
  }, [])

  useEffect(() => {
    setActive(false)
    window.dispatchEvent(new CustomEvent(MARGO_NAV_END))
  }, [pathname])

  if (!active || reduceMotion) return null

  return (
    <div
      aria-hidden
      className="margo-route-progress"
      style={{
        position: 'fixed',
        top: 'env(safe-area-inset-top, 0px)',
        left: 0,
        right: 0,
        height: '2px',
        zIndex: 9999,
        pointerEvents: 'none',
        background: 'linear-gradient(90deg, transparent, var(--gold), transparent)',
        animation: 'margo-route-progress 1.2s ease-in-out infinite',
      }}
    />
  )
}
