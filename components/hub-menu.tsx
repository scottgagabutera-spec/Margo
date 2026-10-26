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
import { computeHubPanelPosition, pickVisibleHubAnchor } from '@/lib/hub-panel-position'
import { useIdentity } from '@/hooks/useIdentity'
import {
  leavePrimaryTabSurface,
  MARGO_CLOSE_HUB_EVENT,
  persistActivePrimaryScroll,
  readActiveScrollTop,
} from '@/components/primary-tab-shell'
import {
  ArrowLeftIcon,
  BellIcon,
  HubGridIcon,
  LibraryIcon,
  LockIcon,
  MessagesIcon,
  PenLineIcon,
  SearchIcon,
} from '@/components/icons'
import { MargoPortraitAvatar } from '@/components/margo-portrait-avatar'
import { PendingNavLink } from '@/components/pending-nav-link'
import { SignInLink } from '@/components/signin-link'
import { persistAuthReturnScroll } from '@/lib/auth-return'
import { isMargoBrandUsername } from '@/lib/margo-brand-account'
import {
  searchHrefForPath,
  searchScopeForPath,
  consumeHubOverlayRestore,
  markHubNavFromTile,
  clearHubNavFromTile,
} from '@/lib/search-scope'
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

function HubIdentityHeader() {
  const { identity } = useIdentity()
  if (!identity) return null
  const brandMark = isMargoBrandUsername(identity.username)
  const handle = `@${identity.username.replace(/^@/, '')}`
  return (
    <PendingNavLink href="/you" className="margo-hub-identity" data-margo-hub-root>
      <MargoPortraitAvatar
        size="hub"
        imageUrl={identity.avatarUrl}
        fallbackInitial={(identity.displayName || identity.username || '?').slice(0, 1)}
        fallbackSeed={!identity.avatarUrl && !brandMark ? identity.username : null}
        brandMark={brandMark}
      />
      <span className="margo-hub-identity__text">
        <span className="margo-hub-identity__name">{identity.displayName || identity.username}</span>
        <span className="margo-hub-identity__handle">{handle}</span>
      </span>
    </PendingNavLink>
  )
}

function hubTileClassName(tile: ResolvedHubTile, pending: boolean) {
  return [
    'margo-hub-tile',
    tile.id === 'stage' ? 'margo-hub-tile--stage' : '',
    tile.dimmed ? 'margo-hub-tile--dimmed' : '',
    pending ? 'margo-hub-tile--pending' : '',
    tile.locked ? 'margo-hub-tile--locked-nav' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function HubTileLink({
  tile,
  signedIn,
  pending,
  navLocked,
  onBeginNavigate,
  onClose,
  onLockedActivate,
}: {
  tile: ResolvedHubTile
  signedIn: boolean
  pending: boolean
  navLocked: boolean
  onBeginNavigate: (href: string) => boolean
  onClose: () => void
  onLockedActivate: (returnTo: string) => void
}) {
  const badge = signedIn ? hubTileBadgeLabel(tile.count) : ''
  const dest = tile.href
  const showLock = tile.locked
  const ariaLabel =
    showLock
      ? `${tile.label}. Sign in required`
      : badge
        ? `${tile.label}, ${badge} new`
        : tile.label

  const tileBody = (
    <>
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
    </>
  )

  if (showLock) {
    return (
      <button
        type="button"
        onClick={() => {
          if (navLocked || pending) return
          persistActivePrimaryScroll()
          persistAuthReturnScroll()
          onLockedActivate(tile.href)
        }}
        data-margo-hub-root
        data-hub-tile={tile.id}
        aria-label={ariaLabel}
        className={hubTileClassName(tile, pending)}
      >
        {tileBody}
      </button>
    )
  }

  return (
    <Link
      href={dest}
      onClick={(e) => {
        if (navLocked || pending) {
          e.preventDefault()
          return
        }
        if (!onBeginNavigate(dest)) {
          e.preventDefault()
          return
        }
        leavePrimaryTabSurface()
        if (tile.id !== 'stage') {
          markHubNavFromTile()
        }
        onClose()
      }}
      data-margo-hub-root
      data-hub-tile={tile.id}
      aria-busy={pending}
      aria-label={ariaLabel}
      className={hubTileClassName(tile, pending)}
    >
      {tileBody}
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
  hubNavAnchorRef: RefObject<HTMLButtonElement | null>
  hubTabAnchorRef: RefObject<HTMLButtonElement | null>
  signInReturnTo: string
  onLockedActivate: (returnTo: string) => void
}

const HubContext = createContext<HubContextValue | null>(null)

function useHub(): HubContextValue {
  const ctx = useContext(HubContext)
  if (!ctx) throw new Error('Hub components must be used within HubProvider')
  return ctx
}

function HubPanelHeader({ onClose, showBack }: { onClose: () => void; showBack: boolean }) {
  return (
    <div className="margo-hub-panel-head" data-margo-hub-root>
      {showBack ? (
        <button
          type="button"
          className="margo-hub-panel-head__back"
          aria-label="Close Hub"
          onClick={onClose}
        >
          <ArrowLeftIcon size={20} color="var(--gold)" />
        </button>
      ) : null}
      <span className="margo-hub-panel-head__title">Hub</span>
    </div>
  )
}

function HubTiles({
  signedIn,
  close,
  tiles,
  pendingHref,
  beginNavigate,
  signInReturnTo,
  onLockedActivate,
}: {
  signedIn: boolean
  close: () => void
  tiles: ResolvedHubTile[]
  pendingHref: string | null
  beginNavigate: (href: string) => boolean
  signInReturnTo: string
  onLockedActivate: (returnTo: string) => void
}) {
  return (
    <>
      {signedIn ? <HubIdentityHeader /> : null}
      {tiles.map((tile) => {
        const dest = tile.href
        return (
          <HubTileLink
            key={tile.id}
            tile={tile}
            signedIn={signedIn}
            pending={pendingHref === dest}
            navLocked={!!pendingHref && pendingHref !== dest}
            onBeginNavigate={beginNavigate}
            onClose={close}
            onLockedActivate={onLockedActivate}
          />
        )
      })}
      {!signedIn ? (
        <div className="margo-hub-signed-out-cta">
          <p className="margo-hub-signed-out-cta__line">Sign in to open your space</p>
          <SignInLink
            id="margo-hub-sign-in"
            returnTo={signInReturnTo}
            onClick={close}
            data-margo-hub-root
            className="margo-hub-sign-in-btn"
          >
            Sign in
          </SignInLink>
        </div>
      ) : null}
    </>
  )
}

function HubPanelBody({
  signedIn,
  close,
  tiles,
  pendingHref,
  beginNavigate,
  signInReturnTo,
  onLockedActivate,
  showBack,
}: {
  signedIn: boolean
  close: () => void
  tiles: ResolvedHubTile[]
  pendingHref: string | null
  beginNavigate: (href: string) => boolean
  signInReturnTo: string
  onLockedActivate: (returnTo: string) => void
  showBack: boolean
}) {
  return (
    <div className="margo-hub-shell">
      <HubPanelHeader onClose={close} showBack={showBack} />
      <div className="margo-hub-grid">
        <HubTiles
          signedIn={signedIn}
          close={close}
          tiles={tiles}
          pendingHref={pendingHref}
          beginNavigate={beginNavigate}
          signInReturnTo={signInReturnTo}
          onLockedActivate={onLockedActivate}
        />
      </div>
    </div>
  )
}

function HubPanel() {
  const {
    open,
    close,
    signedIn,
    tiles,
    pendingHref,
    beginNavigate,
    hubNavAnchorRef,
    hubTabAnchorRef,
    signInReturnTo,
    onLockedActivate,
  } = useHub()
  const [mounted, setMounted] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const desktopRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const sync = () => setIsDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const positionDesktopPanel = useCallback(() => {
    const panel = desktopRef.current
    if (!panel) return
    const anchor = pickVisibleHubAnchor(hubNavAnchorRef.current, hubTabAnchorRef.current)
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const { left, top } = computeHubPanelPosition({
      anchorRect: rect,
      panelWidth: panel.offsetWidth,
      panelHeight: panel.offsetHeight,
      viewportWidth: document.documentElement.clientWidth,
      viewportHeight: document.documentElement.clientHeight,
      margin: 8,
      gap: 8,
    })
    panel.style.left = `${left}px`
    panel.style.top = `${top}px`
    panel.style.right = 'auto'
    panel.style.transform = 'none'
  }, [hubNavAnchorRef, hubTabAnchorRef])

  useLayoutEffect(() => {
    if (!open) return
    const isDesktopMq = window.matchMedia('(min-width: 640px)').matches
    const panel = isDesktopMq ? desktopRef.current : sheetRef.current
    if (!panel) return
    if (!isDesktopMq) {
      panel.style.removeProperty('left')
      panel.style.removeProperty('top')
      panel.style.removeProperty('right')
      panel.style.removeProperty('transform')
      return
    }
    positionDesktopPanel()
  }, [open, hubNavAnchorRef, hubTabAnchorRef, tiles.length, signedIn, positionDesktopPanel])

  useEffect(() => {
    if (!open) return
    const onReposition = () => positionDesktopPanel()
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, positionDesktopPanel])

  if (!mounted || !open) return null

  const bodyProps = {
    signedIn,
    close,
    tiles,
    pendingHref,
    beginNavigate,
    signInReturnTo,
    onLockedActivate,
    showBack: !isDesktop,
  }

  return createPortal(
    <>
      <div
        ref={sheetRef}
        className="margo-hub-sheet"
        data-margo-hub-root
        role="dialog"
        aria-modal="false"
        aria-label="Hub"
      >
        <HubPanelBody {...bodyProps} />
      </div>
      <div
        ref={desktopRef}
        className="margo-hub-panel"
        data-margo-hub-root
        role="dialog"
        aria-modal="false"
        aria-label="Hub"
      >
        <HubPanelBody {...bodyProps} />
      </div>
    </>,
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
  const [signInReturnTo, setSignInReturnTo] = useState('/feed?hub=1')
  const pendingHrefRef = useRef<string | null>(null)
  const hubNavAnchorRef = useRef<HTMLButtonElement | null>(null)
  const hubTabAnchorRef = useRef<HTMLButtonElement | null>(null)
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

  const onLockedActivate = useCallback((returnTo: string) => {
    setSignInReturnTo(returnTo)
    window.requestAnimationFrame(() => {
      document.getElementById('margo-hub-sign-in')?.focus()
    })
  }, [])

  useEffect(() => {
    pendingHrefRef.current = null
    setPendingHref(null)
    const pathOnly = (pathname || '/feed').split('?')[0]
    const hubRestoreSurface =
      pathOnly === '/feed'
      || pathOnly === '/discover'
      || pathOnly === '/compose'
      || pathOnly === '/you'
    const restoreHub = typeof window !== 'undefined'
      && hubRestoreSurface
      && (
        new URLSearchParams(window.location.search).get('hub') === '1'
        || consumeHubOverlayRestore()
      )
    if (restoreHub) {
      setOpen(true)
    } else if (hubRestoreSurface) {
      setOpen(false)
    }
    if (restoreHub && typeof window !== 'undefined') {
      clearHubNavFromTile()
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
      pendingHref, beginNavigate, hubNavAnchorRef, hubTabAnchorRef, signInReturnTo, onLockedActivate,
    }),
    [open, toggle, close, hasActivity, tiles, signedIn, pendingHref, beginNavigate, signInReturnTo, onLockedActivate],
  )

  return (
    <HubContext.Provider value={value}>
      {children}
      <HubPanel />
    </HubContext.Provider>
  )
}

export function HubIconButton() {
  const { open, toggle, hubHasUnread, hubNavAnchorRef } = useHub()
  return (
    <button
      ref={hubNavAnchorRef}
      type="button"
      data-margo-hub-root
      data-hub-anchor="nav"
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
  const { open, toggle, hubHasUnread, hubTabAnchorRef } = useHub()
  return (
    <button
      ref={hubTabAnchorRef}
      type="button"
      data-margo-hub-root
      data-hub-anchor="tab"
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

