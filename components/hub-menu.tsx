'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { useAuthGate } from '@/components/supabase-auth-provider'
import { useHubSurfaces } from '@/hooks/useHubSurfaces'
import { MARGO_CLOSE_HUB_EVENT, persistActivePrimaryScroll, readActiveScrollTop } from '@/components/primary-tab-shell'
import {
  BellIcon,
  HubGridIcon,
  LibraryIcon,
  LockIcon,
  MessagesIcon,
  PenLineIcon,
  SearchIcon,
} from '@/components/icons'
import { PendingNavLink } from '@/components/pending-nav-link'
import { buildSigninHref, persistAuthReturnScroll } from '@/lib/auth-return'
import { searchHrefForPath, searchScopeForPath, consumeHubOverlayRestore } from '@/lib/search-scope'
import {
  hubTileBadgeLabel,
  type HubTileIconId,
  type ResolvedHubTile,
} from '@/lib/hub/tiles'

const SCROLL_DISTANCE_PX = 24
const SCROLL_VELOCITY_PX_MS = 0.6
const TOUCH = 'var(--margo-touch-min)'

function TileIcon({ kind }: { kind: HubTileIconId }) {
  const color = 'var(--gold)'
  const size = 22
  if (kind === 'library') return <LibraryIcon size={size} color={color} />
  if (kind === 'messages') return <MessagesIcon size={size} color={color} />
  if (kind === 'stage') return <PenLineIcon size={size} color={color} />
  return <BellIcon size={size} color={color} />
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

function HubTileLink({
  tile,
  signedIn,
  pending,
  navLocked,
  onBeginNavigate,
}: {
  tile: ResolvedHubTile
  signedIn: boolean
  pending: boolean
  navLocked: boolean
  onBeginNavigate: (href: string) => boolean
}) {
  const badge = signedIn ? hubTileBadgeLabel(tile.count) : ''
  const dest = signedIn || !tile.needsAccount ? tile.href : buildSigninHref(tile.href)
  const showLock = tile.locked

  return (
    <Link
      href={dest}
      onClick={(e) => {
        if (tile.locked) {
          persistActivePrimaryScroll()
          persistAuthReturnScroll()
        }
        if (navLocked || pending || !onBeginNavigate(dest)) {
          e.preventDefault()
        }
      }}
      data-margo-hub-root
      data-hub-tile={tile.id}
      aria-busy={pending}
      aria-label={
        showLock
          ? `${tile.label}. Sign in required`
          : badge
            ? `${tile.label}, ${badge} new`
            : tile.label
      }
      className={[
        'margo-hub-tile',
        tile.id === 'stage' ? 'margo-hub-tile--stage' : '',
        tile.dimmed ? 'margo-hub-tile--dimmed' : '',
        pending ? 'margo-hub-tile--pending' : '',
        tile.locked ? 'margo-hub-tile--locked-nav' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {showLock ? (
        <span className="margo-hub-tile__lock" aria-hidden>
          <LockIcon size={16} color="var(--text-muted)" />
        </span>
      ) : badge ? (
        <span className="margo-hub-tile__badge" aria-hidden>
          {badge}
        </span>
      ) : null}
      <span className="margo-hub-tile__icon-wrap">
        <TileIcon kind={tile.icon} />
      </span>
      <span className="margo-hub-tile__label">{tile.label}</span>
    </Link>
  )
}

type HubContextValue = {
  open: boolean
  setOpen: (v: boolean) => void
  toggle: () => void
  close: () => void
  hubHasUnread: boolean
  tiles: ResolvedHubTile[]
  signedIn: boolean
  pendingHref: string | null
  beginNavigate: (href: string) => boolean
  hubAnchorRef: RefObject<HTMLButtonElement | null>
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
  tiles,
  pendingHref,
  beginNavigate,
}: {
  signedIn: boolean
  close: () => void
  tiles: ResolvedHubTile[]
  pendingHref: string | null
  beginNavigate: (href: string) => boolean
}) {
  return (
    <>
      {tiles.map((tile) => {
        const dest = signedIn || !tile.needsAccount ? tile.href : buildSigninHref(tile.href)
        return (
          <HubTileLink
            key={tile.id}
            tile={tile}
            signedIn={signedIn}
            pending={pendingHref === dest}
            navLocked={!!pendingHref && pendingHref !== dest}
            onBeginNavigate={beginNavigate}
          />
        )
      })}
    </>
  )
}

function HubPanel() {
  const { open, close, signedIn, tiles, pendingHref, beginNavigate, hubAnchorRef } = useHub()
  const [mounted, setMounted] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  useLayoutEffect(() => {
    if (!open) return
    const panel = panelRef.current
    const anchor = hubAnchorRef.current
    if (!panel || !anchor) return
    const isDesktop = window.matchMedia('(min-width: 640px)').matches
    if (!isDesktop) {
      panel.style.removeProperty('left')
      panel.style.removeProperty('top')
      return
    }
    const ar = anchor.getBoundingClientRect()
    const pw = panel.offsetWidth
    let left = ar.left + ar.width / 2 - pw / 2
    left = Math.max(12, Math.min(left, window.innerWidth - pw - 12))
    panel.style.left = `${left}px`
    panel.style.top = `${ar.bottom + 10}px`
  }, [open, hubAnchorRef, tiles.length])

  if (!mounted || !open) return null

  const tileProps = {
    signedIn,
    close,
    tiles,
    pendingHref,
    beginNavigate,
  }

  return createPortal(
    <div className="margo-hub-overlay" data-margo-hub-root>
      <button
        type="button"
        className="margo-hub-scrim"
        aria-label="Close Hub"
        onClick={close}
      />
      <div
        ref={panelRef}
        className="margo-hub-launcher"
        role="dialog"
        aria-modal="true"
        aria-label="Margo apps"
        data-margo-hub-root
      >
        <div className="margo-hub-shell">
          <div className="margo-hub-grid">
            <HubTiles {...tileProps} />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function HubProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { user, loading: authLoading } = useAuthGate()
  const signedIn = !authLoading && !!user && !user.is_anonymous

  const { tiles, hasActivity } = useHubSurfaces(signedIn)

  const [open, setOpen] = useState(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const pendingHrefRef = useRef<string | null>(null)
  const hubAnchorRef = useRef<HTMLButtonElement | null>(null)
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
    setPendingHref(null)
    const restoreHub = typeof window !== 'undefined'
      && (
        new URLSearchParams(window.location.search).get('hub') === '1'
        || consumeHubOverlayRestore()
      )
    setOpen(restoreHub)
    if (restoreHub && typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('hub')
      const next = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '')
      window.history.replaceState(window.history.state, '', next)
    }
  }, [pathname])

  useEffect(() => {
    const onPrimaryTab = () => close()
    window.addEventListener(MARGO_CLOSE_HUB_EVENT, onPrimaryTab)
    return () => window.removeEventListener(MARGO_CLOSE_HUB_EVENT, onPrimaryTab)
  }, [close])

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (pendingHrefRef.current) return
      const target = e.target
      if (!(target instanceof Element)) return
      if (target.closest('[data-margo-hub-root]')) return
      if (target.closest('.margo-mobile-tabbar, .margo-nav')) return
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
      open, setOpen, toggle, close, hubHasUnread: hasActivity, tiles, signedIn,
      pendingHref, beginNavigate, hubAnchorRef,
    }),
    [open, toggle, close, hasActivity, tiles, signedIn, pendingHref, beginNavigate],
  )

  return (
    <HubContext.Provider value={value}>
      {children}
      <HubPanel />
    </HubContext.Provider>
  )
}

export function HubIconButton() {
  const { open, toggle, hubHasUnread, hubAnchorRef } = useHub()
  return (
    <button
      ref={hubAnchorRef}
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

export function HubTabButton({ style, labelStyle }: { style: CSSProperties; labelStyle: CSSProperties }) {
  const { open, toggle, hubHasUnread, hubAnchorRef } = useHub()
  return (
    <button
      ref={hubAnchorRef}
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

export function SearchNavLink() {
  const pathname = usePathname()
  const { open } = useHub()
  const href = searchHrefForPath(pathname, open ? '/hub' : null)
  const scope = searchScopeForPath(open ? '/hub' : pathname)
  const active = pathname === '/search'
  return (
    <PendingNavLink
      href={href}
      aria-label={scope.placeholder}
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
      <SearchIcon
        size={20}
        color={active ? 'var(--gold)' : 'rgba(255,255,255,0.5)'}
      />
    </PendingNavLink>
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
