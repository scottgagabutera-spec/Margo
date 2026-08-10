'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'

export type RelativeTimeVariant = 'compact' | 'long'

export type FormatRelativeTimeOptions = {
  /** compact = Alerts/Messages; long = "Xm ago" (PostCard-ready). */
  variant?: RelativeTimeVariant
  /** Label for age &lt; 60s. Default "just now"; Messages uses "now". */
  nowLabel?: string
}

/**
 * Pure relative-time formatter (no React). Bucketed like the old per-file helpers.
 */
export function formatRelativeTime(
  input: number | string | Date,
  options: FormatRelativeTimeOptions = {}
): string {
  const variant = options.variant ?? 'compact'
  const nowLabel = options.nowLabel ?? 'just now'
  const then =
    typeof input === 'number'
      ? input
      : input instanceof Date
        ? input.getTime()
        : new Date(input).getTime()
  if (!Number.isFinite(then)) return ''

  const diffSec = Math.max(0, (Date.now() - then) / 1000)
  if (diffSec < 60) return nowLabel
  if (diffSec < 3600) {
    const n = Math.floor(diffSec / 60)
    return variant === 'long' ? `${n}m ago` : `${n}m`
  }
  if (diffSec < 86400) {
    const n = Math.floor(diffSec / 3600)
    return variant === 'long' ? `${n}h ago` : `${n}h`
  }
  if (variant === 'long') {
    return `${Math.floor(diffSec / 86400)}d ago`
  }
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d`
  return `${Math.floor(diffSec / 604800)}w`
}

function tickMsForAge(ageSec: number): number {
  if (ageSec < 60) return 25_000
  if (ageSec < 3600) return 60_000
  if (ageSec < 86400) return 5 * 60_000
  return 60 * 60_000
}

function isTickAllowed(el: HTMLElement | null): boolean {
  if (typeof document === 'undefined') return false
  if (document.visibilityState === 'hidden') return false
  const pane = el?.closest('[data-margo-primary-tab]')
  if (pane && pane.getAttribute('data-margo-primary-tab-active') === '0') return false
  return true
}

export type RelativeTimeProps = {
  /** Epoch ms, ISO string, or Date. */
  date: number | string | Date
  variant?: RelativeTimeVariant
  nowLabel?: string
  style?: CSSProperties
  className?: string
  title?: string
}

/**
 * Leaf relative-time label. Ticks in isolation (does not re-render parent lists).
 * Pauses when the document is hidden or the closest keepalive pane is inactive;
 * one-shots a fresh label when becoming visible/active again.
 */
export function RelativeTime({
  date,
  variant = 'compact',
  nowLabel = 'just now',
  style,
  className,
  title,
}: RelativeTimeProps) {
  const spanRef = useRef<HTMLSpanElement>(null)
  const [label, setLabel] = useState(() =>
    formatRelativeTime(date, { variant, nowLabel })
  )

  useEffect(() => {
    const opts = { variant, nowLabel }
    const sync = () => setLabel(formatRelativeTime(date, opts))
    sync()

    const el = spanRef.current
    let allowed = isTickAllowed(el)
    let timer: ReturnType<typeof setInterval> | null = null

    const clear = () => {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    }

    const schedule = () => {
      clear()
      if (!allowed) return
      const then =
        typeof date === 'number'
          ? date
          : date instanceof Date
            ? date.getTime()
            : new Date(date).getTime()
      const ageSec = Math.max(0, (Date.now() - then) / 1000)
      timer = setInterval(() => {
        sync()
        schedule()
      }, tickMsForAge(ageSec))
    }

    const onGateChange = () => {
      const next = isTickAllowed(spanRef.current)
      if (next && !allowed) {
        sync()
        allowed = true
        schedule()
        return
      }
      if (!next && allowed) {
        allowed = false
        clear()
      }
    }

    if (allowed) schedule()

    document.addEventListener('visibilitychange', onGateChange)
    const pane = el?.closest('[data-margo-primary-tab]') ?? null
    let mo: MutationObserver | null = null
    if (pane) {
      mo = new MutationObserver(onGateChange)
      mo.observe(pane, { attributes: true, attributeFilter: ['data-margo-primary-tab-active'] })
    }

    return () => {
      clear()
      document.removeEventListener('visibilitychange', onGateChange)
      mo?.disconnect()
    }
  }, [date, variant, nowLabel])

  return (
    <span ref={spanRef} className={className} style={style} title={title}>
      {label}
    </span>
  )
}
