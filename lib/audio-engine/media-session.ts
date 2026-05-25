/**
 * Margo AudioEngine — Media Session API (lock screen, iOS Control Center)
 * @see docs/TARGET_ARCHITECTURE_AUDIO_ENGAGEMENT.md Section 2.5
 *
 * Handlers always delegate to engine → single DOM <audio>.
 * Called before audio.play() from engine.startPlayingAt / togglePlayPause.
 */

import type { AudioEngineState } from './types'
import { getQueueNavigationState } from './types'
import {
  getAudioEngineState,
  togglePlayPause,
  queueNext,
  queuePrev,
  playFullSeek,
} from './engine'

const SEEK_STEP_SEC = 10
const DEFAULT_ARTWORK = '/favicons/apple-touch-icon.png'

function mediaSessionSupported(): boolean {
  return typeof navigator !== 'undefined' && 'mediaSession' in navigator
}

function buildArtwork(state: AudioEngineState): MediaImage[] {
  if (state.artwork) {
    return [{ src: state.artwork, sizes: '512x512', type: 'image/jpeg' }]
  }
  return [{ src: DEFAULT_ARTWORK, sizes: '180x180', type: 'image/png' }]
}

function buildMetadata(state: AudioEngineState): MediaMetadata | null {
  if (state.mode === 'idle' || !state.audioUrl) return null
  if (state.mode === 'snippet' && state.snippet) {
    return new MediaMetadata({
      title: state.snippet.lineText,
      artist: `${state.title} · ${state.artist}`,
      album: 'Margo',
      artwork: buildArtwork(state),
    })
  }
  return new MediaMetadata({
    title: state.title || 'Margo',
    artist: state.artist || 'Trymargo',
    album: 'Margo',
    artwork: buildArtwork(state),
  })
}

function setHandler(
  action: MediaSessionAction,
  handler: MediaSessionActionHandler | null,
): void {
  if (!mediaSessionSupported()) return
  try {
    navigator.mediaSession.setActionHandler(action, handler)
  } catch {
    /* Some browsers reject unsupported actions — safe to ignore */
  }
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Update lock-screen metadata and playback state from engine snapshot.
 * Call immediately before audio.play() and on pause/ended.
 */
export function syncMediaSessionFromState(state: AudioEngineState): void {
  if (!mediaSessionSupported()) return
  const meta = buildMetadata(state)
  if (meta) {
    navigator.mediaSession.metadata = meta
  }
  navigator.mediaSession.playbackState = state.playing ? 'playing' : 'paused'
}

/**
 * Wire action handlers to engine (idempotent — safe to call on every play).
 */
export function bindMediaSessionHandlers(): void {
  if (!mediaSessionSupported()) return

  setHandler('play', () => {
    const s = getAudioEngineState()
    if (s.mode === 'idle') return
    if (!s.playing) togglePlayPause()
  })

  setHandler('pause', () => {
    const s = getAudioEngineState()
    if (s.mode === 'idle') return
    if (s.playing) togglePlayPause()
  })

  setHandler('seekbackward', () => {
    const s = getAudioEngineState()
    if (s.mode !== 'full') return
    playFullSeek(Math.max(0, s.currentTime - SEEK_STEP_SEC))
  })

  setHandler('seekforward', () => {
    const s = getAudioEngineState()
    if (s.mode !== 'full') return
    const cap = s.duration > 0 ? s.duration : s.currentTime + SEEK_STEP_SEC
    playFullSeek(Math.min(cap, s.currentTime + SEEK_STEP_SEC))
  })

  setHandler('previoustrack', () => {
    const s = getAudioEngineState()
    const { canPrev } = getQueueNavigationState(s.queue, s.queueIndex)
    if (!canPrev) return
    queuePrev()
  })

  setHandler('nexttrack', () => {
    const s = getAudioEngineState()
    const { canNext } = getQueueNavigationState(s.queue, s.queueIndex)
    if (!canNext) return
    queueNext()
  })

  /* Stop maps to pause — keeps loaded track for resume */
  setHandler('stop', () => {
    const s = getAudioEngineState()
    if (s.playing) togglePlayPause()
  })
}

/**
 * Remove handlers when engine is idle or provider unmounts.
 */
export function clearMediaSessionHandlers(): void {
  if (!mediaSessionSupported()) return

  const actions: MediaSessionAction[] = [
    'play',
    'pause',
    'seekbackward',
    'seekforward',
    'previoustrack',
    'nexttrack',
    'stop',
  ]
  actions.forEach(action => setHandler(action, null))

  try {
    navigator.mediaSession.playbackState = 'none'
    navigator.mediaSession.metadata = null
  } catch {
    /* ignore */
  }
}
