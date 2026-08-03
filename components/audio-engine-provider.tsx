'use client'

/**
 * Margo AudioEngineProvider
 * @see docs/TARGET_ARCHITECTURE_AUDIO_ENGAGEMENT.md Section 2.1
 *
 * Mounts TWO hidden <audio> elements and attaches them to the engine.
 * Two elements (instead of one) are what make the equal-power crossfade
 * between queued Lyric Moments / Mixtape snippets possible: one element
 * fades out the ending snippet while the other fades in the next one.
 * Must wrap {children} in app/layout.tsx above <MiniPlayer />.
 *
 * Also handles:
 * - ?au= query param warm path for karaoke instant load
 * - Engine cleanup on unmount
 */

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { attachAudioElements, stop } from '@/lib/audio-engine'
import { clearMediaSessionHandlers } from '@/lib/audio-engine/media-session'
import { warmPreloadUrl } from '@/lib/audio-engine/preload-cache'

function AudioEngineInner() {
  const audioRefA = useRef<HTMLAudioElement | null>(null)
  const audioRefB = useRef<HTMLAudioElement | null>(null)
  const searchParams = useSearchParams()

  // Attach both DOM <audio> elements to the engine on mount
  useEffect(() => {
    const elA = audioRefA.current
    const elB = audioRefB.current
    if (!elA || !elB) return

    attachAudioElements(elA, elB)

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
    <>
      <audio
        ref={audioRefA}
        playsInline
        preload="auto"
        style={{ display: 'none' }}
        aria-hidden="true"
      />
      <audio
        ref={audioRefB}
        playsInline
        preload="auto"
        style={{ display: 'none' }}
        aria-hidden="true"
      />
    </>
  )
}

/**
 * Wrap in Suspense because useSearchParams() requires it in Next.js App Router.
 * Both audio elements are mounted immediately — Suspense boundary is transparent.
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
