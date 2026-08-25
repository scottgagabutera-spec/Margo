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
import { useHubSurfaces } from '@/hooks/useHubSurfaces'
import { readActiveScrollTop } from '@/components/primary-tab-shell'
import { BellIcon, HubGridIcon, LibraryIcon, MessagesIcon } from '@/components/icons'
import { LoadingRing } from '@/components/loading-ring'
import { PendingNavLink } from '@/components/pending-nav-link'
import { UI_FONT } from '@/lib/fonts'
import type { HubSurface, HubSurfaceId } from '@/lib/hub/surfaces'

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

function TileIcon({ kind }: { kind: HubSurfaceId }) {
  const color = 'var(--gold)'
  if (kind === 'library') return <LibraryIcon size={18} color={color} />
  if (kind === 'messages') return <MessagesIcon size={18} color={color} />
  return <BellIcon size={18} color={color} />
}

function HubPresenceDot({ visible, top, right }: { visible: boolean; top: string; right: string }) {
  if (!visible) return null
  return (
    <span
      aria-hidden
      style={{
        position: 'absolute',
        top,
        right,
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: 'var(--gold)',
      }}
    />
  )
}

function HubTile({
  surface,
  signedIn,
  pending,
  locked,
  onBeginNavigate,
}: {
  surface: HubSurface
  signedIn: boolean
  pending: boolean
  locked: boolean
  onBeginNavigate: (href: string) => boolean
}) {
  const { href, id, label, unread, wide } = surface
  const badge = signedIn ? badgeLabel(unread) : ''
  const dest = signedIn ? href : '/signin'
  return (
    <Link
      href={dest}
      onClick={(e) => {
        if (locked || pending || !onBeginNavigate(dest)) {
          e.preventDefault()
        }
      }}
      data-margo-hub-root
      aria-busy={pending}
      className="margo-hub-tile"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '14px 12px',
        borderRadius: '12px',
        border: pending ? '1px solid var(--gold-border)' : '1px solid var(--border)',
        background: pending ? 'var(--gold-faint)' : 'rgba(255,255,255,0.02)',
        textDecoration: 'none',
        position: 'relative',
        minHeight: '112px',
        boxSizing: 'border-box',
        gridColumn: wide ? '1 / -1' : undefined,
        opacity: signedIn ? (locked ? 0.45 : 1) : 0.85,
        pointerEvents: locked ? 'none' : 'auto',
        transition: 'background 80ms var(--ease-out), border-color 80ms var(--ease-out)',
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
      <TileIcon kind={id} />
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
      {/* Preview slot — spinner while the destination RSC is in flight */}
      <div
        style={{
          flex: 1,
          minHeight: '40px',
          borderRadius: '8px',
          border: pending ? 'none' : '1px dashed rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-hidden={!pending}
      >
        {pending ? <LoadingRing size={28} strokeWidth={2} state="spinning" /> : null}
      </div>
    </Link>
  )
}

type HubContextValue = {
  open: boolean
  setOpen: (v: boolean) => void
  toggle: () => void
  close: () => void
  hubHasUnread: boolean
  surfaces: HubSurface[]
  signedIn: boolean
  pendingHref: string | null
  beginNavigate: (href: string) => boolean
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
  surfaces,
  pendingHref,
  beginNavigate,
}: {
  signedIn: boolean
  close: () => void
  surfaces: HubSurface[]
  pendingHref: string | null
  beginNavigate: (href: string) => boolean
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
            Sign in to see your Messages, Music Library, and Notifications
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
      {surfaces.map((surface) => {
        const dest = signedIn ? surface.href : '/signin'
        return (
          <HubTile
            key={surface.id}
            surface={surface}
            signedIn={signedIn}
            pending={pendingHref === dest}
            locked={!!pendingHref && pendingHref !== dest}
            onBeginNavigate={beginNavigate}
          />
        )
      })}
    </>
  )
}

function HubPanel() {
  const { open, close, signedIn, surfaces, pendingHref, beginNavigate } = useHub()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted || !open) return null

  const tileProps = {
    signedIn,
    close,
    surfaces,
    pendingHref,
    beginNavigate,
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
        .margo-hub-tile:active {
          background: var(--gold-faint) !important;
          border-color: var(--gold-border) !important;
        }
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

  const { surfaces, hasActivity } = useHubSurfaces(signedIn)

  const [open, setOpen] = useState(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const pendingHrefRef = useRef<string | null>(null)
  const scrollOriginRef = useRef(0)
  const lastScrollRef = useRef({ y: 0, t: 0 })

  const close = useCallback(() => {
    pendingHrefRef.current = null
    setOpen(false)
    setPendingHref(null)
  }, [])
  const toggle = useCallback(() => {
    setOpen((v) => {
      if (v) {
        pendingHrefRef.current = null
        setPendingHref(null)
      }
      return !v
    })
  }, [])
  const beginNavigate = useCallback((href: string) => {
    if (pendingHrefRef.current) return false
    pendingHrefRef.current = href
    setPendingHref(href)
    return true
  }, [])

  useEffect(() => {
    pendingHrefRef.current = null
    setOpen(false)
    setPendingHref(null)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (pendingHrefRef.current) return
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
        if (!pendingHrefRef.current) close()
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
    () => ({
      open, setOpen, toggle, close, hubHasUnread: hasActivity, surfaces, signedIn,
      pendingHref, beginNavigate,
    }),
    [open, toggle, close, hasActivity, surfaces, signedIn, pendingHref, beginNavigate],
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
  const { open, toggle, hubHasUnread } = useHub()
  return (
    <button
      type="button"
      data-margo-hub-root
      onClick={toggle}
      aria-label={hubHasUnread ? 'Hub, new activity' : 'Hub'}
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
      <HubGridIcon size={20} color="currentColor" />
      <HubPresenceDot visible={hubHasUnread} top="6px" right="6px" />
    </button>
  )
}

/** Mobile tab-bar Hub control — label visible (Brand §14 feed-action rule). */
export function HubTabButton({ style, labelStyle }: { style: CSSProperties; labelStyle: CSSProperties }) {
  const { open, toggle, hubHasUnread } = useHub()
  return (
    <button
      type="button"
      data-margo-hub-root
      onClick={toggle}
      aria-label={hubHasUnread ? 'Hub, new activity' : 'Hub'}
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
        <HubGridIcon size={20} color="currentColor" />
        <HubPresenceDot visible={hubHasUnread} top="-2px" right="-2px" />
      </span>
      <span style={labelStyle}>Hub</span>
    </button>
  )
}

export function LibraryNavLink() {
  const pathname = usePathname()
  const active = pathname === '/library' || pathname?.startsWith('/library/')
  return (
    <PendingNavLink
      href="/library"
      aria-label="Music Library"
      ringSize={18}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: TOUCH,
        height: TOUCH,
        position: 'relative',
        boxSizing: 'border-box',
        flexShrink: 0,
        borderRadius: '8px',
      }}
    >
      <LibraryIcon
        size={20}
        color={active ? 'var(--gold)' : 'rgba(255,255,255,0.5)'}
      />
    </PendingNavLink>
  )
}
