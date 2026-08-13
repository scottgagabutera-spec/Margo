'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { useUnreadMessagesCount } from '@/hooks/useUnreadMessagesCount'
import { readActiveScrollTop } from '@/components/primary-tab-shell'

const font = 'var(--font-geist-sans), system-ui, sans-serif'

/** Scroll dismiss: ≥24px cumulative ΔY or velocity ≥0.6 px/ms */
const SCROLL_DISTANCE_PX = 24
const SCROLL_VELOCITY_PX_MS = 0.6

function badgeLabel(n: number): string {
  if (n <= 0) return ''
  return n > 9 ? '9+' : String(n)
}

function HubGridIcon({ active }: { active: boolean }) {
  const stroke = active ? 'var(--gold)' : 'rgba(255,255,255,0.5)'
  const cells = [4, 10, 16]
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      {cells.map((y) =>
        cells.map((x) => (
          <rect
            key={`${x}-${y}`}
            x={x - 1.5}
            y={y - 1.5}
            width="3"
            height="3"
            rx="0.5"
            stroke={stroke}
            strokeWidth="1.25"
          />
        )),
      )}
    </svg>
  )
}

function TileIcon({ kind }: { kind: 'messages' | 'library' | 'alerts' }) {
  const stroke = 'var(--gold)'
  if (kind === 'messages') {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path d="M3 5h14v9H7l-4 3V5Z" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    )
  }
  if (kind === 'library') {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
        <rect x="3" y="4" width="4" height="12" rx="1" stroke={stroke} strokeWidth="1.5" />
        <rect x="8" y="4" width="4" height="12" rx="1" stroke={stroke} strokeWidth="1.5" />
        <rect x="13" y="4" width="4" height="12" rx="1" stroke={stroke} strokeWidth="1.5" />
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M5 8a5 5 0 0 1 10 0c0 3 1 4.5 1.5 5.2.3.4 0 .8-.5.8H4c-.5 0-.8-.4-.5-.8C4 12.5 5 11 5 8Z"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8 16a2 2 0 0 0 4 0" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function HubTile({
  href,
  kind,
  label,
  count,
  onNavigate,
}: {
  href: string
  kind: 'messages' | 'library' | 'alerts'
  label: string
  count: number
  onNavigate: () => void
}) {
  const badge = badgeLabel(count)
  return (
    <Link
      href={href}
      onClick={onNavigate}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '12px',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.02)',
        textDecoration: 'none',
        position: 'relative',
        minHeight: '112px',
        boxSizing: 'border-box',
      }}
    >
      {badge ? (
        <span
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            minWidth: '16px',
            height: '16px',
            borderRadius: '50%',
            background: 'var(--gold)',
            color: 'var(--bg)',
            fontFamily: font,
            fontSize: '0.5rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 3px',
            boxSizing: 'border-box',
          }}
        >
          {badge}
        </span>
      ) : null}
      <TileIcon kind={kind} />
      <span
        style={{
          fontFamily: font,
          fontSize: '0.72rem',
          fontWeight: 700,
          letterSpacing: '0.5px',
          color: 'var(--text)',
        }}
      >
        {label}
      </span>
      {/* Reserved preview slot for live content later */}
      <div
        style={{
          flex: 1,
          minHeight: '40px',
          borderRadius: '8px',
          border: '1px dashed rgba(255,255,255,0.06)',
          background: 'transparent',
        }}
        aria-hidden
      />
    </Link>
  )
}

/**
 * Hub — Messages / Library / Alerts launcher.
 * Opening does NOT mark alerts read.
 */
export function HubMenu() {
  const pathname = usePathname()
  const { notifications } = useNotifications()
  const messagesUnread = useUnreadMessagesCount()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const scrollOriginRef = useRef(0)
  const lastScrollRef = useRef({ y: 0, t: 0 })

  const alertsUnread = notifications.filter(
    (n) => !n.readAt && n.type !== 'message',
  ).length
  const libraryUnread = 0
  const hubTotal = messagesUnread + alertsUnread + libraryUnread
  const hubBadge = badgeLabel(hubTotal)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Tap outside
  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const el = rootRef.current
      if (!el) return
      const target = e.target
      if (target instanceof Node && !el.contains(target)) close()
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
    }
  }, [open, close])

  // Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  // Smart scroll dismiss
  useEffect(() => {
    if (!open) return
    scrollOriginRef.current = readActiveScrollTop()
    lastScrollRef.current = { y: scrollOriginRef.current, t: performance.now() }

    const onScroll = (e: Event) => {
      const hub = rootRef.current
      if (hub && e.target instanceof Node && hub.contains(e.target)) return

      const y = readActiveScrollTop()
      const now = performance.now()
      const prev = lastScrollRef.current
      const dt = Math.max(1, now - prev.t)
      const vy = Math.abs(y - prev.y) / dt
      lastScrollRef.current = { y, t: now }

      const distance = Math.abs(y - scrollOriginRef.current)
      if (distance >= SCROLL_DISTANCE_PX || vy >= SCROLL_VELOCITY_PX_MS) {
        close()
      }
    }

    // Pane scroll roots + window
    const panes = document.querySelectorAll('[data-margo-primary-tab]')
    panes.forEach((el) => el.addEventListener('scroll', onScroll, { passive: true }))
    window.addEventListener('scroll', onScroll, { passive: true, capture: true })
    return () => {
      panes.forEach((el) => el.removeEventListener('scroll', onScroll))
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open, close])

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Hub"
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 'var(--margo-touch-min)',
          height: 'var(--margo-touch-min)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          boxSizing: 'border-box',
          padding: 0,
        }}
      >
        <HubGridIcon active={open} />
        {hubBadge ? (
          <span
            style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              minWidth: '15px',
              height: '15px',
              borderRadius: '50%',
              background: 'var(--gold)',
              color: 'var(--bg)',
              fontFamily: font,
              fontSize: '0.5rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px',
              boxSizing: 'border-box',
            }}
          >
            {hubBadge}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          {/* Mobile full-width sheet */}
          <div
            className="margo-hub-sheet"
            style={{
              position: 'fixed',
              top: 'var(--nav-height, 72px)',
              left: 0,
              right: 0,
              zIndex: 60,
              background: 'var(--bg)',
              borderBottom: '1px solid var(--border)',
              boxShadow: '0 12px 28px rgba(0,0,0,0.45)',
              padding: '14px 16px 18px',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                maxWidth: '560px',
                margin: '0 auto',
              }}
            >
              <HubTile
                href="/messages"
                kind="messages"
                label="Messages"
                count={messagesUnread}
                onNavigate={close}
              />
              <HubTile
                href="/library"
                kind="library"
                label="Library"
                count={libraryUnread}
                onNavigate={close}
              />
              <div style={{ gridColumn: '1 / -1' }}>
                <HubTile
                  href="/notifications"
                  kind="alerts"
                  label="Alerts"
                  count={alertsUnread}
                  onNavigate={close}
                />
              </div>
            </div>
          </div>

          {/* Desktop anchored panel */}
          <div
            className="margo-hub-panel"
            style={{
              display: 'none',
              position: 'absolute',
              top: 'calc(100% + 10px)',
              right: 0,
              width: '360px',
              zIndex: 60,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              boxShadow: '0 12px 28px rgba(0,0,0,0.45)',
              padding: '12px',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '8px',
              }}
            >
              <HubTile
                href="/messages"
                kind="messages"
                label="Messages"
                count={messagesUnread}
                onNavigate={close}
              />
              <HubTile
                href="/library"
                kind="library"
                label="Library"
                count={libraryUnread}
                onNavigate={close}
              />
              <HubTile
                href="/notifications"
                kind="alerts"
                label="Alerts"
                count={alertsUnread}
                onNavigate={close}
              />
            </div>
          </div>

          <style>{`
            @media (min-width: 640px) {
              .margo-hub-sheet { display: none !important; }
              .margo-hub-panel { display: block !important; }
            }
          `}</style>
        </>
      ) : null}
    </div>
  )
}

export function LibraryNavLink() {
  const pathname = usePathname()
  const active = pathname === '/library' || pathname?.startsWith('/library/')
  return (
    <Link
      href="/library"
      aria-label="Library"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 'var(--margo-touch-min)',
        height: 'var(--margo-touch-min)',
        position: 'relative',
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <rect
          x="3"
          y="4"
          width="4"
          height="12"
          rx="1"
          stroke={active ? 'var(--gold)' : 'rgba(255,255,255,0.5)'}
          strokeWidth="1.5"
        />
        <rect
          x="8"
          y="4"
          width="4"
          height="12"
          rx="1"
          stroke={active ? 'var(--gold)' : 'rgba(255,255,255,0.5)'}
          strokeWidth="1.5"
        />
        <rect
          x="13"
          y="4"
          width="4"
          height="12"
          rx="1"
          stroke={active ? 'var(--gold)' : 'rgba(255,255,255,0.5)'}
          strokeWidth="1.5"
        />
      </svg>
    </Link>
  )
}
