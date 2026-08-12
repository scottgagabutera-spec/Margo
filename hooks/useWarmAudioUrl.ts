'use client'

import { useEffect, type RefObject } from 'react'
import { warmUrl } from '@/lib/audio-engine'

/**
 * Warm an audio URL in the preload pool when the host element scrolls into view.
 */
export function useWarmAudioUrlOnVisible(
  audioUrl: string | null | undefined,
  rootRef: RefObject<HTMLElement | null>,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled || !audioUrl) return
    const el = rootRef.current
    if (!el) return

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          warmUrl(audioUrl)
          obs.disconnect()
        }
      },
      { threshold: 0.1 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [audioUrl, enabled, rootRef])
}
