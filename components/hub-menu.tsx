'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useNotifications } from '@/hooks/useNotifications'
import { useUnreadMessagesCount } from '@/hooks/useUnreadMessagesCount'
import { readActiveScrollTop } from '@/components/primary-tab-shell'
import { UI_FONT } from '@/lib/fonts'

/** UI chrome — MARGO_BRAND §3 Geist Sans */
const font = UI_FONT

/** Scroll dismiss: ≥24px cumulative ΔY or velocity ≥0.6 px/ms */
const SCROLL_DISTANCE_PX = 24
const SCROLL_VELOCITY_PX_MS = 0.6

/** Brand §14 / §15 — touch target floor */
const TOUCH = 'var(--margo-touch-min)'

function badgeLabel(n: number): string {
  if (n <= 0) return ''
  return n > 9 ? '9+' : String(n)
}

/** 3×3 grid — stroke 1.5 per MARGO_BRAND §5 icon system */
export function HubGridIcon({ active, size = 20 }: { active: boolean; size?: number }) {
  const stroke = active ? 'var(--gold)' : 'currentColor'
  const cells = [4, 10, 16]
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
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
            strokeWidth="1.5"
          />
        )),
      )}
    </svg>
  )
}

function TileIcon({ kind }: { kind: 'library' | 'messages' | 'alerts' }) {
  const stroke = 'var(--gold)'
  if (kind === 'library') {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
        <rect x="3" y="4" width="4" height="12" rx="1" stroke={stroke} strokeWidth="1.5" />
        <rect x="8" y="4" width="4" height="12" rx="1" stroke={stroke} strokeWidth="1.5" />
        <rect x="13" y="4" width="4" height="12" rx="1" stroke={stroke} strokeWidth="1.5" />
      </svg>
    )
  }
  if (kind === 'messages') {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path d="M3 5h14v9H7l-4 3V5Z" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
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
  signedIn,
  onNavigate,
  wide,
}: {
  href: string
  kind: 'library' | 'messages' | 'alerts'
  label: string
  count: number
  signedIn: boolean
  onNavigate: () => void
  wide?: boolean
}) {
  const badge = signedIn ? badgeLabel(count) : ''
  const dest = signedIn ? href : '/signin'
  return (
    <Link
      href={dest}
      onClick={onNavigate}
      data-margo-hub-root
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '14px 12px',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.02)',
        textDecoration: 'none',
        position: 'relative',
        minHeight: '112px',
        boxSizing: 'border-box',
        gridColumn: wide ? '1 / -1' : undefined,
        opacity: signedIn ? 1 : 0.85,
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
            fontSize: '0.55rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
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
          letterSpacing: '0.4px',
          color: 'var(--text)',
          lineHeight: 1.25,
        }}
      >
        {label}
      </span>
      {/* Reserved preview slot — live content later */}
      <div
        style={{
          flex: 1,
          minHeight: '40px',
          borderRadius: '8px',
          border: '1px dashed rgba(255,255,255,0.06)',
        }}
        aria-hidden
      />
    </Link>
  )
}

type HubContextValue = {
  open: boolean
  setOpen: (v: boolean) => void
  toggle: () => void
  close: () => void
  hubBadge: string
  signedIn: boolean
}

const HubContext = createContext<HubContextValue | null>(null)

function useHub(): HubContextValue {
  const ctx = useContext(HubContext)
  if (!ctx) throw new Error('Hub components must be used within HubProvider')
  return ctx
}

function HubTiles({
  signedIn,
  close,
  alertsUnread,
  messagesUnread,
  libraryUnread,
}: {
  signedIn: boolean
  close: () => void
  alertsUnread: number
  messagesUnread: number
  libraryUnread: number
}) {
  return (
    <>
      {!signedIn && (
        <div
          style={{
            gridColumn: '1 / -1',
            padding: '14px 16px',
            borderRadius: '12px',
            border: '1px solid rgba(232,197,71,0.25)',
            background: 'rgba(232,197,71,0.06)',
            marginBottom: '4px',
          }}
        >
          <p
            style={{
              fontFamily: font,
              fontSize: '0.82rem',
              color: 'var(--text)',
              margin: '0 0 10px',
              lineHeight: 1.4,
            }}
          >
            Sign in to see your Messages, Music Library, and Alerts
          </p>
          <Link
            href="/signin"
            onClick={close}
            data-margo-hub-root
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: TOUCH,
              padding: '0 20px',
              borderRadius: '50px',
              background: 'var(--gold)',
              color: 'var(--bg)',
              fontFamily: font,
              fontSize: '0.6rem',
              fontWeight: 700,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              textDecoration: 'none',
              boxSizing: 'border-box',
            }}
          >
            Sign In
          </Link>
        </div>
      )}
      {/* Library first / full-width — product priority + labeled (not icon-only) */}
      <HubTile
        href="/library"
        kind="library"
        label="Music Library"
        count={libraryUnread}
        signedIn={signedIn}
        onNavigate={close}
        wide
      />
      <HubTile
        href="/messages"
        kind="messages"
        label="Messages"
        count={messagesUnread}
        signedIn={signedIn}
        onNavigate={close}
      />
      <HubTile
        href="/notifications"
        kind="alerts"
        label="Alerts"
        count={alertsUnread}
        signedIn={signedIn}
        onNavigate={close}
      />
    </>
  )
}

function HubPanel() {
  const { open, close, signedIn } = useHub()
  const { notifications } = useNotifications()
  const messagesUnread = useUnreadMessagesCount()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const alertsUnread = signedIn
    ? notifications.filter((n) => !n.readAt && n.type !== 'message').length
    : 0
  const libraryUnread = 0

  if (!mounted || !open) return null

  const tileProps = {
    signedIn,
    close,
    alertsUnread,
    messagesUnread,
    libraryUnread,
  }

  return createPortal(
    <>
      {/* Mobile: sheet under nav, above tab bar */}
      <div
        className="margo-hub-sheet"
        data-margo-hub-root
        style={{
          position: 'fixed',
          top: 'var(--nav-height, 72px)',
          left: 0,
          right: 0,
          bottom: 'var(--margo-tabbar-h, 0px)',
          zIndex: 55,
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
          boxShadow: '0 12px 28px rgba(0,0,0,0.45)',
          padding: '14px 16px 18px',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
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
          <HubTiles {...tileProps} />
        </div>
      </div>

      {/* Desktop: anchored panel */}
      <div
        className="margo-hub-panel"
        data-margo-hub-root
        style={{
          display: 'none',
          position: 'fixed',
          top: 'calc(var(--nav-height, 72px) + 8px)',
          right: '24px',
          width: '380px',
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
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
          }}
        >
          <HubTiles {...tileProps} />
        </div>
      </div>

      <style>{`
        @media (min-width: 640px) {
          .margo-hub-sheet { display: none !important; }
          .margo-hub-panel { display: block !important; }
        }
      `}</style>
    </>,
    document.body,
  )
}

export function HubProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { user, loading: authLoading } = useAuthGate()
  const signedIn = !authLoading && !!user && !user.is_anonymous

  const { notifications } = useNotifications()
  const messagesUnread = useUnreadMessagesCount()

  const [open, setOpen] = useState(false)
  const scrollOriginRef = useRef(0)
  const lastScrollRef = useRef({ y: 0, t: 0 })

  const alertsUnread = signedIn
    ? notifications.filter((n) => !n.readAt && n.type !== 'message').length
    : 0
  const hubTotal = signedIn ? messagesUnread + alertsUnread : 0
  const hubBadge = badgeLabel(hubTotal)

  const close = useCallback(() => setOpen(false), [])
  const toggle = useCallback(() => setOpen((v) => !v), [])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target
      if (!(target instanceof Element)) return
      if (target.closest('[data-margo-hub-root]')) return
      close()
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
    }
  }, [open, close])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  useEffect(() => {
    if (!open) return
    scrollOriginRef.current = readActiveScrollTop()
    lastScrollRef.current = { y: scrollOriginRef.current, t: performance.now() }

    const onScroll = (e: Event) => {
      if (e.target instanceof Element && e.target.closest('[data-margo-hub-root]')) return
      const y = readActiveScrollTop()
      const now = performance.now()
      const prev = lastScrollRef.current
      const dt = Math.max(1, now - prev.t)
      const vy = Math.abs(y - prev.y) / dt
      lastScrollRef.current = { y, t: now }
      if (Math.abs(y - scrollOriginRef.current) >= SCROLL_DISTANCE_PX || vy >= SCROLL_VELOCITY_PX_MS) {
        close()
      }
    }

    const panes = document.querySelectorAll('[data-margo-primary-tab]')
    panes.forEach((el) => el.addEventListener('scroll', onScroll, { passive: true }))
    window.addEventListener('scroll', onScroll, { passive: true, capture: true })
    return () => {
      panes.forEach((el) => el.removeEventListener('scroll', onScroll))
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open, close])

  const value = useMemo(
    () => ({ open, setOpen, toggle, close, hubBadge, signedIn }),
    [open, toggle, close, hubBadge, signedIn],
  )

  return (
    <HubContext.Provider value={value}>
      {children}
      <HubPanel />
    </HubContext.Provider>
  )
}

/** Desktop / top-bar icon trigger — 44×44 touch (Brand §14). */
export function HubIconButton() {
  const { open, toggle, hubBadge } = useHub()
  return (
    <button
      type="button"
      data-margo-hub-root
      onClick={toggle}
      aria-label="Hub"
      aria-expanded={open}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: TOUCH,
        height: TOUCH,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        boxSizing: 'border-box',
        padding: 0,
        color: open ? 'var(--gold)' : 'rgba(255,255,255,0.5)',
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
            fontSize: '0.55rem',
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
  )
}

/** Mobile tab-bar Hub control — label visible (Brand §14 feed-action rule). */
export function HubTabButton({ style, labelStyle }: { style: CSSProperties; labelStyle: CSSProperties }) {
  const { open, toggle, hubBadge } = useHub()
  return (
    <button
      type="button"
      data-margo-hub-root
      onClick={toggle}
      aria-label="Hub"
      aria-expanded={open}
      style={{
        ...style,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        width: '100%',
        color: open ? 'var(--gold)' : 'var(--text-muted)',
      }}
    >
      <span style={{ position: 'relative', display: 'inline-flex' }}>
        <HubGridIcon active={open} />
        {hubBadge ? (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-8px',
              minWidth: '14px',
              height: '14px',
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
      </span>
      <span style={labelStyle}>Hub</span>
    </button>
  )
}

export function LibraryNavLink() {
  const pathname = usePathname()
  const active = pathname === '/library' || pathname?.startsWith('/library/')
  return (
    <Link
      href="/library"
      aria-label="Music Library"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: TOUCH,
        height: TOUCH,
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
