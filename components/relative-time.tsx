'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'

const DAY_SEC = 86_400
const WEEK_SEC = 7 * DAY_SEC

export type RelativeTimeVariant = 'compact' | 'long'

export type FormatRelativeTimeOptions = {
  /**
   * Kept for callers (Alerts/Messages compact, PostCard long). Buckets are
   * identical under the current product rules — absolute dates replace "w ago".
   */
  variant?: RelativeTimeVariant
  /** Label for age &lt; 60s. Default "now". */
  nowLabel?: string
}

function toMs(input: number | string | Date): number {
  if (typeof input === 'number') return input
  if (input instanceof Date) return input.getTime()
  return new Date(input).getTime()
}

function formatAbsoluteDate(thenMs: number, nowMs: number): string {
  const then = new Date(thenMs)
  const month = then.toLocaleString('en-US', { month: 'short' })
  const day = then.getDate()
  const thenYear = then.getFullYear()
  const nowYear = new Date(nowMs).getFullYear()
  if (thenYear === nowYear) return `${month} ${day}`
  return `${month} ${day}, ${thenYear}`
}

/**
 * Pure relative→absolute time formatter.
 * Relative through &lt; 7 days; bare calendar date at 7+ days (no time-of-day).
 */
export function formatRelativeTime(
  input: number | string | Date,
  options: FormatRelativeTimeOptions = {}
): string {
  const nowLabel = options.nowLabel ?? 'now'
  const then = toMs(input)
  if (!Number.isFinite(then)) return ''

  const now = Date.now()
  const diffSec = Math.max(0, (now - then) / 1000)

  if (diffSec < 60) return nowLabel
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`
  if (diffSec < DAY_SEC) return `${Math.floor(diffSec / 3600)}h`
  if (diffSec < WEEK_SEC) return `${Math.floor(diffSec / DAY_SEC)}d`
  return formatAbsoluteDate(then, now)
}

/** Interval for adaptive tick, or null when the label is a static absolute date. */
function tickMsForAge(ageSec: number): number | null {
  if (ageSec >= WEEK_SEC) return null
  if (ageSec < 60) return 25_000
  if (ageSec < 3600) return 60_000
  if (ageSec < DAY_SEC) return 5 * 60_000
  // 1d–6d: "Xd" changes on day boundaries — hourly is enough.
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
 * Stops the timer entirely once age ≥ 7 days (absolute date is static).
 */
export function RelativeTime({
  date,
  variant = 'compact',
  nowLabel = 'now',
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
      const then = toMs(date)
      const ageSec = Math.max(0, (Date.now() - then) / 1000)
      const ms = tickMsForAge(ageSec)
      // Absolute dates (7+ days) need no interval.
      if (ms == null) return
      timer = setInterval(() => {
        sync()
        schedule()
      }, ms)
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
