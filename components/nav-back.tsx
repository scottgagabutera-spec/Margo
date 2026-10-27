'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  canPopNavStack,
  consumeNextNavAsReplace,
  navStackDepth,
  recordNavPop,
  recordNavPush,
  recordNavReplace,
  resetNavStack,
} from '@/lib/in-app-nav-stack'
import {
  clearHubNavFromTile,
  markHubOverlayRestore,
  openedFromHubTile,
} from '@/lib/search-scope'

/** @deprecated Use canPopNavStack — kept for callers that imported canPopInAppHistory */
export function canPopInAppHistory() {
  return canPopNavStack()
}

export { navStackDepth as inAppDepthForTests }

function NavHistoryTracker() {
  const pathname = usePathname()
  const prev = useRef<string | null>(null)
  const popped = useRef(false)

  useEffect(() => {
    const onPop = () => {
      popped.current = true
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    const path = pathname.split('?')[0] || '/'
    if (prev.current == null) {
      prev.current = path
      resetNavStack(path)
      return
    }
    if (prev.current === path) return
    if (popped.current) {
      popped.current = false
      recordNavPop()
    } else if (consumeNextNavAsReplace()) {
      recordNavReplace(path)
    } else {
      recordNavPush(path)
    }
    prev.current = path
  }, [pathname])

  return null
}

export type NavBackConfig = {
  fallbackHref?: string
  preferHistory?: boolean
  /** When there is no in-app history, replace the current entry instead of pushing. */
  replace?: boolean
  onBack?: () => boolean | void
  label?: string
}

/**
 * Depth routes get Back in the fixed nav (Instagram / Apple Music pattern).
 * Primary tabs do not. Pages can override via `useRegisterNavBack`.
 */
function hubAwareFallback(defaultHref: string): string {
  return openedFromHubTile() ? '/feed?hub=1' : defaultHref
}

function hubTileBack(defaultHref: string): NavBackConfig {
  return {
    fallbackHref: hubAwareFallback(defaultHref),
    replace: true,
    preferHistory: false,
    onBack: () => {
      if (openedFromHubTile()) {
        markHubOverlayRestore()
        clearHubNavFromTile()
      }
      return false
    },
  }
}

export function navBackForPath(pathname: string | null | undefined): NavBackConfig | null {
  if (!pathname) return null
  const p = pathname.split('?')[0]
  if (
    p === '/' ||
    p === '/feed' ||
    p === '/discover' ||
    p === '/compose' ||
    p === '/you' ||
    p.startsWith('/song/') ||
    p.startsWith('/m/') ||
    p === '/signin' ||
    p.startsWith('/auth/') ||
    p === '/admin' ||
    p.startsWith('/admin/')
  ) {
    return null
  }

  if (p === '/messages') {
    return { ...hubTileBack('/feed'), label: 'Messages' }
  }
  if (p.startsWith('/messages/')) {
    return {
      fallbackHref: '/messages',
      replace: true,
      preferHistory: false,
      label: 'Messages',
    }
  }
  if (p === '/notifications') {
    return { ...hubTileBack('/feed'), label: 'Notifications' }
  }

  if (p === '/search') return { fallbackHref: '/feed', replace: true }
  if (p === '/studio') return { fallbackHref: '/you', preferHistory: false }
  if (p.startsWith('/studio/')) return { fallbackHref: '/studio' }
  if (p === '/settings' || p === '/profile/edit' || p === '/apply-artist') {
    return { fallbackHref: '/you' }
  }
  if (p === '/library') {
    return { ...hubTileBack('/feed'), label: 'Music Library' }
  }
  if (p.startsWith('/library/')) return { fallbackHref: '/library' }
  if (p.startsWith('/discover/') || p === '/artists') return { fallbackHref: '/discover' }
  if (p.startsWith('/post/')) return { fallbackHref: '/feed', preferHistory: true, replace: true }
  if (p === '/lyric-back') return { fallbackHref: '/feed', replace: true }
  if (p === '/about' || p === '/contact' || p === '/privacy' || p === '/terms' || p === '/dmca' || p === '/data-deletion' || p === '/help' || p.startsWith('/help/') || p === '/faq') {
    return { fallbackHref: '/' }
  }

  const parts = p.split('/').filter(Boolean)
  if (parts[0] === 'profile' && parts[1] && parts[2]) {
    return { fallbackHref: `/profile/${parts[1]}` }
  }
  if (parts[0] === 'profile' && parts[1] && !parts[2]) {
    return { fallbackHref: '/feed' }
  }

  return null
}

const NavBackOverrideContext = createContext<{
  override: NavBackConfig | null
  setOverride: (next: NavBackConfig | null) => void
}>({ override: null, setOverride: () => {} })

export function NavBackProvider({ children }: { children: React.ReactNode }) {
  const [override, setOverride] = useState<NavBackConfig | null>(null)
  return (
    <NavBackOverrideContext.Provider value={{ override, setOverride }}>
      <NavHistoryTracker />
      {children}
    </NavBackOverrideContext.Provider>
  )
}

export function useNavBackOverride() {
  return useContext(NavBackOverrideContext).override
}

/** Page-level override (Studio in-page edit, post parent fallback). */
export function useRegisterNavBack(config: NavBackConfig | null) {
  const { setOverride } = useContext(NavBackOverrideContext)
  const onBackRef = useRef(config?.onBack)
  onBackRef.current = config?.onBack

  const fallbackHref = config?.fallbackHref
  const preferHistory = config?.preferHistory
  const replace = config?.replace
  const label = config?.label
  const enabled = config != null

  useEffect(() => {
    if (!enabled) {
      setOverride(null)
      return
    }
    setOverride({
      fallbackHref,
      preferHistory,
      replace,
      label,
      onBack: () => onBackRef.current?.(),
    })
    return () => setOverride(null)
  }, [enabled, fallbackHref, preferHistory, replace, label, setOverride])
}
