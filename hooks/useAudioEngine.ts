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
import {
  computePlaybackProgress,
  getQueueNavigationState,
} from '@/lib/audio-engine/types'

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
 * Returns true when the given songId is buffering (playing state requested
 * but audio not yet ready).
 */
export function useIsBuffering(songId: string | null | undefined): boolean {
  const [buffering, setBuffering] = useState(false)

  useEffect(() => {
    const unsub = subscribeAudioEngine(s => {
      setBuffering(s.buffering && s.songId === songId)
    })
    return unsub
  }, [songId])

  return buffering
}

function snippetUiFlags(
  s: AudioEngineState,
  songId: string | null | undefined,
  lineKey: string | number | null | undefined,
): { playing: boolean; buffering: boolean } {
  if (!songId) return { playing: false, buffering: false }
  const lineMatch =
    lineKey == null
      ? true
      : typeof lineKey === 'number'
        ? s.snippet?.lineIndex === lineKey
        : (s.snippet?.lineText || '').slice(0, 140) === lineKey.slice(0, 140)
  const isThis = s.mode === 'snippet' && s.songId === songId && lineMatch
  return {
    playing: s.playing && isThis,
    buffering: s.buffering && isThis,
  }
}

/**
 * Snippet playback UI flags for a specific line (feed cards, discover moments).
 * Reads current engine state on mount so a card that appears mid-play shows pause, not play.
 */
/** Feed post — one play control for the whole post-moment session. */
export function usePostMomentPlaybackUi(
  postKey: string | null | undefined,
  songId: string | null | undefined,
): { playing: boolean; buffering: boolean } {
  const [flags, setFlags] = useState({ playing: false, buffering: false })

  useEffect(() => {
    const sync = (s: AudioEngineState) => {
      if (!postKey || !songId) {
        setFlags({ playing: false, buffering: false })
        return
      }
      const isThis =
        s.mode === 'snippet'
        && s.songId === songId
        && s.postMomentPlayback?.postKey === postKey
      setFlags({
        playing: s.playing && isThis,
        buffering: s.buffering && isThis,
      })
    }
    sync(getAudioEngineState())
    return subscribeAudioEngine(sync)
  }, [postKey, songId])

  return flags
}

/** Progress + elapsed/total labels for merged post-moment playback on feed cards. */
export function usePostMomentPlaybackMetrics(
  postKey: string | null | undefined,
  songId: string | null | undefined,
  totalDurationSec: number,
): {
  playing: boolean
  buffering: boolean
  progressPct: number
  elapsedSec: number
} {
  const [snap, setSnap] = useState({
    playing: false,
    buffering: false,
    progressPct: 0,
    elapsedSec: 0,
  })

  useEffect(() => {
    const sync = (s: AudioEngineState) => {
      if (!postKey || !songId) {
        setSnap({ playing: false, buffering: false, progressPct: 0, elapsedSec: 0 })
        return
      }
      const isThis =
        s.mode === 'snippet'
        && s.songId === songId
        && s.postMomentPlayback?.postKey === postKey
      const playing = s.playing && isThis
      const buffering = s.buffering && isThis
      if (!isThis) {
        setSnap({ playing: false, buffering: false, progressPct: 0, elapsedSec: 0 })
        return
      }
      const progressPct = computePlaybackProgress(
        s.mode,
        s.currentTime,
        s.duration,
        s.snippet,
        s.postMomentPlayback,
        s.queueIndex,
      )
      const segs = s.postMomentPlayback?.segments ?? []
      let elapsed = 0
      for (let i = 0; i < s.queueIndex && i < segs.length; i++) {
        elapsed += Math.max(0, segs[i].endSec - segs[i].startSec)
      }
      if (s.snippet) {
        const span = s.snippet.endSec - s.snippet.startSec
        const cur = span <= 0 ? 0 : Math.max(0, Math.min(s.currentTime - s.snippet.startSec, span))
        elapsed += cur
      }
      setSnap({
        playing,
        buffering,
        progressPct,
        elapsedSec: elapsed,
      })
    }
    sync(getAudioEngineState())
    return subscribeAudioEngine(sync)
  }, [postKey, songId, totalDurationSec])

  return snap
}

export function useSnippetPlaybackUi(
  songId: string | null | undefined,
  lineKey: string | number | null | undefined,
): { playing: boolean; buffering: boolean } {
  const [flags, setFlags] = useState(() => snippetUiFlags(getAudioEngineState(), songId, lineKey))

  useEffect(() => {
    const sync = (s: AudioEngineState) => setFlags(snippetUiFlags(s, songId, lineKey))
    sync(getAudioEngineState())
    return subscribeAudioEngine(sync)
  }, [songId, lineKey])

  return flags
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
    return getQueueNavigationState(s.queue, s.queueIndex, s.postMomentPlayback)
  })

  useEffect(() => {
    const unsub = subscribeAudioEngine(s => {
      setNav(getQueueNavigationState(s.queue, s.queueIndex, s.postMomentPlayback))
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

function pickAtmosphereRoom(s: AudioEngineState) {
  return {
    playing: s.playing,
    mode: s.mode,
    songId: s.songId,
    atmosphere: s.atmosphere,
    lineText: s.snippet?.lineText ?? null,
  }
}

/** Atmosphere room fields only — ignores currentTime so cards do not tick. */
export function useAtmosphereRoomState(): {
  playing: boolean
  mode: AudioEngineState['mode']
  songId: string | null
  atmosphere: AudioEngineState['atmosphere']
  lineText: string | null
} {
  const [slice, setSlice] = useState(() => pickAtmosphereRoom(getAudioEngineState()))

  useEffect(() => {
    const unsub = subscribeAudioEngine((s) => {
      const next = pickAtmosphereRoom(s)
      setSlice((prev) => (
        prev.playing === next.playing &&
        prev.mode === next.mode &&
        prev.songId === next.songId &&
        prev.atmosphere === next.atmosphere &&
        prev.lineText === next.lineText
          ? prev
          : next
      ))
    })
    return unsub
  }, [])

  return slice
}
