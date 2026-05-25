'use client'

/**
 * Margo — useAudioEngine hook
 * @see docs/TARGET_ARCHITECTURE_AUDIO_ENGAGEMENT.md Section 2.1
 *
 * React hook that subscribes to AudioEngine state.
 * All surfaces (feed, music page, mini player, karaoke) use this
 * to read current playback state without owning any audio logic.
 *
 * Usage:
 *   const { playing, songId, mode, snippet } = useAudioEngine()
 *
 * For actions, import directly from '@/lib/audio-engine':
 *   import { playSnippet, togglePlayPause } from '@/lib/audio-engine'
 */

import { useEffect, useState } from 'react'
import {
  subscribeAudioEngine,
  getAudioEngineState,
} from '@/lib/audio-engine/engine'
import type { AudioEngineState } from '@/lib/audio-engine/types'
import { getQueueNavigationState } from '@/lib/audio-engine/types'

// ── Full state hook ───────────────────────────────────────────────

/**
 * Subscribe to the full AudioEngine state.
 * Re-renders on every state change — use selective hooks below
 * for performance-sensitive surfaces.
 */
export function useAudioEngine(): AudioEngineState {
  const [state, setState] = useState<AudioEngineState>(getAudioEngineState)

  useEffect(() => {
    const unsub = subscribeAudioEngine(setState)
    return unsub
  }, [])

  return state
}

// ── Selective hooks (avoids unnecessary re-renders) ───────────────

/**
 * Returns true only when the given songId is currently playing.
 * Use on feed cards and music board cards to show active state.
 */
export function useIsPlaying(songId: string | null | undefined): boolean {
  const [active, setActive] = useState(false)

  useEffect(() => {
    const unsub = subscribeAudioEngine(s => {
      setActive(s.playing && s.songId === songId)
    })
    return unsub
  }, [songId])

  return active
}

/**
 * Returns whether the given songId is the current track
 * (playing or paused — just loaded in engine).
 */
export function useIsActiveTrack(songId: string | null | undefined): boolean {
  const [active, setActive] = useState(false)

  useEffect(() => {
    const unsub = subscribeAudioEngine(s => {
      setActive(s.songId === songId && s.mode !== 'idle')
    })
    return unsub
  }, [songId])

  return active
}

/**
 * Current playback progress 0–100 (mode-aware).
 * Use on scrubbers and progress bars.
 */
export function usePlaybackProgress(): number {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const unsub = subscribeAudioEngine(s => setProgress(s.progress))
    return unsub
  }, [])

  return progress
}

/**
 * Queue navigation flags for mini player prev/next buttons.
 */
export function useQueueNavigation() {
  const [nav, setNav] = useState(() => {
    const s = getAudioEngineState()
    return getQueueNavigationState(s.queue, s.queueIndex)
  })

  useEffect(() => {
    const unsub = subscribeAudioEngine(s => {
      setNav(getQueueNavigationState(s.queue, s.queueIndex))
    })
    return unsub
  }, [])

  return nav
}

/**
 * Current time in seconds — high frequency updates.
 * Use only on karaoke lyric sync; avoid on cards.
 */
export function useAudioCurrentTime(): number {
  const [time, setTime] = useState(0)

  useEffect(() => {
    const unsub = subscribeAudioEngine(s => setTime(s.currentTime))
    return unsub
  }, [])

  return time
}
