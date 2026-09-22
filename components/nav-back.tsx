'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

/** Client-side pushes in this tab. 0 on a fresh load / new tab. */
let inAppDepth = 0

export function canPopInAppHistory() {
  return inAppDepth > 0
}

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
    if (prev.current == null) {
      prev.current = pathname
      return
    }
    if (prev.current === pathname) return
    if (popped.current) {
      popped.current = false
      inAppDepth = Math.max(0, inAppDepth - 1)
    } else {
      inAppDepth += 1
    }
    prev.current = pathname
  }, [pathname])

  return null
}

export type NavBackConfig = {
  fallbackHref?: string
  preferHistory?: boolean
  onBack?: () => boolean | void
  label?: string
}

/**
 * Depth routes get Back in the fixed nav (Instagram / Apple Music pattern).
 * Primary tabs do not. Pages can override via `useRegisterNavBack`.
 */
export function navBackForPath(pathname: string | null | undefined): NavBackConfig | null {
  if (!pathname) return null
  const p = pathname.split('?')[0]
  if (
    p === '/' ||
    p === '/feed' ||
    p === '/discover' ||
    p === '/compose' ||
    p === '/you' ||
    p === '/messages' ||
    p.startsWith('/song/') ||
    p.startsWith('/m/') ||
    p === '/signin' ||
    p.startsWith('/auth/') ||
    p === '/admin' ||
    p.startsWith('/admin/')
  ) {
    return null
  }

  if (p === '/search') return { fallbackHref: '/feed' }
  if (p === '/studio') return { fallbackHref: '/you', preferHistory: false }
  if (p.startsWith('/studio/')) return { fallbackHref: '/studio' }
  if (p === '/settings' || p === '/profile/edit' || p === '/apply-artist') {
    return { fallbackHref: '/you' }
  }
  if (p === '/library') return { fallbackHref: '/discover' }
  if (p.startsWith('/library/')) return { fallbackHref: '/library' }
  if (p.startsWith('/discover/') || p === '/artists') return { fallbackHref: '/discover' }
  if (p.startsWith('/post/')) return { fallbackHref: '/feed' }
  if (p === '/lyric-back') return { fallbackHref: '/feed' }
  if (p === '/about' || p === '/contact' || p === '/privacy' || p === '/terms' || p === '/dmca' || p === '/help' || p.startsWith('/help/') || p === '/faq') {
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
      label,
      onBack: () => onBackRef.current?.(),
    })
    return () => setOverride(null)
  }, [enabled, fallbackHref, preferHistory, label, setOverride])
}
