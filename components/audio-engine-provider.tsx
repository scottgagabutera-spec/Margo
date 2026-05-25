'use client'

/**
 * Margo AudioEngineProvider
 * @see docs/TARGET_ARCHITECTURE_AUDIO_ENGAGEMENT.md Section 2.1
 *
 * Mounts the single hidden <audio> element and attaches it to the engine.
 * Must wrap {children} in app/layout.tsx above <MiniPlayer />.
 *
 * Also handles:
 * - ?au= query param warm path for karaoke instant load
 * - Engine cleanup on unmount
 */

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { attachAudioElement, stop } from '@/lib/audio-engine/engine'
import { clearMediaSessionHandlers } from '@/lib/audio-engine/media-session'
import { warmPreloadUrl } from '@/lib/audio-engine/preload-cache'

function AudioEngineInner() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const searchParams = useSearchParams()

  // Attach the DOM <audio> element to the engine on mount
  useEffect(() => {
    const el = audioRef.current
    if (!el) return

    attachAudioElement(el)

    // Warm ?au= query param (karaoke pre-buffer path)
    const au = searchParams?.get('au')
    if (au) {
      warmPreloadUrl(decodeURIComponent(au))
    }

    return () => {
      // Stop playback and clear Media Session on provider unmount
      stop({ clearQueue: true })
      clearMediaSessionHandlers()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-warm when ?au= changes (e.g. navigating to different karaoke song)
  useEffect(() => {
    const au = searchParams?.get('au')
    if (au) {
      warmPreloadUrl(decodeURIComponent(au))
    }
  }, [searchParams])

  return (
    <audio
      ref={audioRef}
      playsInline
      preload="auto"
      style={{ display: 'none' }}
      aria-hidden="true"
    />
  )
}

/**
 * Wrap in Suspense because useSearchParams() requires it in Next.js App Router.
 * The audio element is mounted immediately — Suspense boundary is transparent.
 */
import { Suspense } from 'react'

export function AudioEngineProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <AudioEngineInner />
      </Suspense>
      {children}
    </>
  )
}
