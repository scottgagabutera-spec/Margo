'use client'

import { useEffect, useRef } from 'react'

/**
 * Re-run a catch-up fetch when the tab becomes visible again.
 * Does not run on mount — callers load initially themselves.
 */
export function useForegroundCatchup(refresh: () => void, enabled: boolean) {
  const refreshRef = useRef(refresh)
  refreshRef.current = refresh

  useEffect(() => {
    if (!enabled) return

    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshRef.current()
    }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pageshow', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pageshow', onVisible)
    }
  }, [enabled])
}
