/**
 * Margo AudioEngine — single DOM <audio> controller (module singleton)
 * @see docs/TARGET_ARCHITECTURE_AUDIO_ENGAGEMENT.md Section 2.3–2.4
 */

import {
  type AudioEngineListener,
  type AudioEngineState,
  type LyricMomentQueueItem,
  type PlayFullRequest,
  type PlaySnippetRequest,
  type SnippetBounds,
  type StopOptions,
  INITIAL_AUDIO_ENGINE_STATE,
  computePlaybackProgress,
  getSnippetStopDurationMs,
  queueItemToSnippetRequest,
} from './types'
import { syncMediaSessionFromState, bindMediaSessionHandlers, clearMediaSessionHandlers } from './media-session'
import { registerPreloadSong, warmPreloadUrl } from './preload-cache'

// ── Module state ──────────────────────────────────────────────────

let _state: AudioEngineState = { ...INITIAL_AUDIO_ENGINE_STATE }
let _audio: HTMLAudioElement | null = null
let _listeners = new Set<AudioEngineListener>()
let _snippetTimer: ReturnType<typeof setTimeout> | null = null
let _handlerGeneration = 0
let _wakeLock: WakeLockSentinel | null = null

// ── Notify / patch ────────────────────────────────────────────────

function notify(): void {
  const snapshot = { ..._state }
  _listeners.forEach(fn => fn(snapshot))
}

function patch(partial: Partial<AudioEngineState>): void {
  _state = { ..._state, ...partial }
  if (
    partial.currentTime !== undefined ||
    partial.duration !== undefined ||
    partial.mode !== undefined ||
    partial.snippet !== undefined
  ) {
    _state.progress = computePlaybackProgress(
      _state.mode,
      _state.currentTime,
      _state.duration,
      _state.snippet,
    )
  }
  notify()
}

function bumpSession(): number {
  _handlerGeneration += 1
  patch({ sessionGeneration: _handlerGeneration })
  return _handlerGeneration
}

function clearSnippetTimer(): void {
  if (_snippetTimer) {
    clearTimeout(_snippetTimer)
    _snippetTimer = null
  }
}

// ── Wake lock (mobile karaoke / long snippets) ────────────────────

async function requestWakeLock(): Promise<void> {
  if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return
  try {
    _wakeLock = await navigator.wakeLock.request('screen')
  } catch {
    /* ignore — optional enhancement */
  }
}

function releaseWakeLock(): void {
  if (_wakeLock) {
    _wakeLock.release().catch(() => {})
    _wakeLock = null
  }
}

// ── Audio element guard ───────────────────────────────────────────

function requireAudio(): HTMLAudioElement {
  if (!_audio) {
    throw new Error('[AudioEngine] No audio element attached — mount AudioEngineProvider first')
  }
  return _audio
}

// ── Handler binding (generation-guarded) ──────────────────────────

function bindAudioHandlers(generation: number): void {
  const audio = requireAudio()

  audio.onloadedmetadata = () => {
    if (generation !== _handlerGeneration) return
    patch({ duration: audio.duration || 0, buffering: false })
  }

  audio.ontimeupdate = () => {
    if (generation !== _handlerGeneration) return
    patch({
      currentTime: audio.currentTime,
      duration: audio.duration || _state.duration,
    })
    /* Snippet: clamp stop at endSec (timer is primary; this guards drift) */
    if (_state.mode === 'snippet' && _state.snippet && _state.playing) {
      if (audio.currentTime >= _state.snippet.endSec + 0.05) {
        pauseSnippetAtEnd()
      }
    }
  }

  audio.onended = () => {
    if (generation !== _handlerGeneration) return
    if (_state.mode !== 'full') return
    clearSnippetTimer()
    releaseWakeLock()
    patch({ playing: false, progress: 0, currentTime: 0 })
    syncMediaSessionFromState(_state)
  }

  audio.onerror = () => {
    if (generation !== _handlerGeneration) return
    clearSnippetTimer()
    releaseWakeLock()
    patch({ playing: false, buffering: false, error: 'Playback failed' })
  }
}

function pauseSnippetAtEnd(): void {
  const audio = _audio
  if (!audio) return
  clearSnippetTimer()
  audio.pause()
  releaseWakeLock()
  patch({ playing: false })
  syncMediaSessionFromState(_state)
}

// ── Load / ready ──────────────────────────────────────────────────
// FIX: Use 'canplay' (fires as soon as the browser can start playing — a few
// frames of data) instead of 'canplaythrough' (fires only after the browser
// estimates it can play to the end without buffering, which on mobile networks
// is very late or never).
// FIX: Do NOT call audio.load() if the element already has the correct src and
// has already started loading (readyState > 0) — load() resets all buffering
// progress, causing the very buffering delay we're trying to avoid.

function waitUntilCanPlay(audio: HTMLAudioElement, generation: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (generation !== _handlerGeneration) {
      reject(new Error('stale'))
      return
    }
    const ready = () => {
      if (generation !== _handlerGeneration) {
        reject(new Error('stale'))
        return
      }
      resolve()
    }
    // readyState >= 2 (HAVE_CURRENT_DATA) is enough to seek and start playing
    if (audio.readyState >= 2) {
      ready()
      return
    }
    patch({ buffering: true })
    const onCanPlay = () => {
      audio.removeEventListener('canplay', onCanPlay)
      audio.removeEventListener('error', onErr)
      ready()
    }
    const onErr = () => {
      audio.removeEventListener('canplay', onCanPlay)
      audio.removeEventListener('error', onErr)
      reject(new Error('load failed'))
    }
    audio.addEventListener('canplay', onCanPlay, { once: true })
    audio.addEventListener('error', onErr, { once: true })
    // Only call load() if the browser hasn't started loading yet (readyState 0 = HAVE_NOTHING
    // with no src set, or after an explicit src change in prepareSource).
    // If readyState is already 1 (HAVE_METADATA) the browser is already fetching — don't reset it.
    if (audio.readyState === 0) {
      audio.load()
    }
  })
}

async function prepareSource(audioUrl: string, generation: number): Promise<void> {
  const audio = requireAudio()
  const sameSrc =
    audio.src === audioUrl || audio.src === new URL(audioUrl, window.location.href).href
  if (!sameSrc) {
    audio.pause()
    audio.src = audioUrl
    // After setting a new src, readyState resets to 0 — load() is needed
    audio.load()
  }
  await waitUntilCanPlay(audio, generation)
}

// ── Snippet timer (Section 2.6 — single source) ───────────────────

function armSnippetTimer(generation: number): void {
  clearSnippetTimer()
  const snippet = _state.snippet
  if (!snippet || _state.mode !== 'snippet') return
  const ms = getSnippetStopDurationMs(snippet.startSec, snippet.endSec)
  _snippetTimer = setTimeout(() => {
    if (generation !== _handlerGeneration) return
    pauseSnippetAtEnd()
  }, ms)
}

// ── Core play helpers ─────────────────────────────────────────────

async function startPlayingAt(
  generation: number,
  seekSec: number,
  opts: { armSnippet: boolean },
): Promise<void> {
  const audio = requireAudio()
  if (generation !== _handlerGeneration) return

  bindMediaSessionHandlers()
  syncMediaSessionFromState(_state)

  audio.currentTime = seekSec
  patch({ buffering: false })

  try {
    await audio.play()
  } catch {
    patch({ playing: false, buffering: false, error: 'Play blocked — tap to start' })
    return
  }

  if (generation !== _handlerGeneration) return

  patch({ playing: true, error: null })
  requestWakeLock()
  syncMediaSessionFromState(_state)

  if (opts.armSnippet) armSnippetTimer(generation)
}

function applyTrackMetadata(
  req: (Pick<PlaySnippetRequest, 'songId' | 'audioUrl' | 'title' | 'artist' | 'artwork'> & { vibe?: string | null }) | Pick<PlayFullRequest, 'songId' | 'audioUrl' | 'title' | 'artist' | 'artwork'>,
  mode: AudioEngineState['mode'],
  snippet: SnippetBounds | null,
): void {
  patch({
    mode,
    songId: req.songId,
    audioUrl: req.audioUrl,
    title: req.title,
    artist: req.artist,
    artwork: req.artwork ?? null,
    vibe: ('vibe' in req ? req.vibe : null) ?? null,
    snippet,
    error: null,
    currentTime: 0,
    progress: 0,
  })
}

// ── Public API: subscription ──────────────────────────────────────

export function subscribeAudioEngine(listener: AudioEngineListener): () => void {
  _listeners.add(listener)
  listener({ ..._state })
  return () => _listeners.delete(listener)
}

export function getAudioEngineState(): AudioEngineState {
  return { ..._state }
}

// ── Public API: lifecycle ─────────────────────────────────────────

export function attachAudioElement(el: HTMLAudioElement): void {
  _audio = el
  el.preload = 'auto'
  el.setAttribute('playsinline', '')
  el.volume = _state.muted ? 0 : _state.volume
  bindMediaSessionHandlers()
}

// ── Public API: playback (exclusive) ──────────────────────────────

export async function playSnippet(request: PlaySnippetRequest): Promise<void> {
  const generation = bumpSession()
  clearSnippetTimer()
  releaseWakeLock()

  const snippet: SnippetBounds = {
    startSec: request.startSec,
    endSec: request.endSec,
    lineIndex: request.lineIndex,
    lineText: request.lineText,
  }

  applyTrackMetadata(request, 'snippet', snippet)
  registerPreloadSong(request.songId, request.audioUrl)

  try {
    await prepareSource(request.audioUrl, generation)
  } catch {
    if (generation !== _handlerGeneration) return
    patch({ playing: false, buffering: false, error: 'Could not load audio' })
    return
  }

  if (generation !== _handlerGeneration) return
  bindAudioHandlers(generation)
  await startPlayingAt(generation, request.startSec, { armSnippet: true })
}

export async function playFull(request: PlayFullRequest): Promise<void> {
  const generation = bumpSession()
  clearSnippetTimer()
  releaseWakeLock()

  const startSec = request.startSec ?? 0
  applyTrackMetadata(request, 'full', null)
  registerPreloadSong(request.songId, request.audioUrl)

  try {
    await prepareSource(request.audioUrl, generation)
  } catch {
    if (generation !== _handlerGeneration) return
    patch({ playing: false, buffering: false, error: 'Could not load audio' })
    return
  }

  if (generation !== _handlerGeneration) return
  bindAudioHandlers(generation)

  if (request.autoplay) {
    await startPlayingAt(generation, startSec, { armSnippet: false })
  } else {
    const audio = requireAudio()
    audio.currentTime = startSec
    patch({ playing: false, buffering: false, currentTime: startSec })
    syncMediaSessionFromState(_state)
  }
}

export function togglePlayPause(): void {
  if (_state.mode === 'idle' || !_audio) return

  if (_state.playing) {
    _audio.pause()
    clearSnippetTimer()
    releaseWakeLock()
    patch({ playing: false })
    syncMediaSessionFromState(_state)
    return
  }

  const generation = _handlerGeneration
  const audio = requireAudio()

  if (_state.mode === 'snippet' && _state.snippet) {
    if (
      audio.currentTime < _state.snippet.startSec ||
      audio.currentTime >= _state.snippet.endSec
    ) {
      audio.currentTime = _state.snippet.startSec
    }
    bindMediaSessionHandlers()
    syncMediaSessionFromState(_state)
    audio
      .play()
      .then(() => {
        if (generation !== _handlerGeneration) return
        patch({ playing: true, error: null })
        requestWakeLock()
        armSnippetTimer(generation)
        syncMediaSessionFromState(_state)
      })
      .catch(() => patch({ error: 'Play blocked — tap to start' }))
    return
  }

  /* full mode — FIX: use 'canplay' instead of 'canplaythrough' */
  bindMediaSessionHandlers()
  syncMediaSessionFromState(_state)
  if (audio.readyState >= 2) {
    audio.play().catch(() => patch({ error: 'Play blocked — tap to start' }))
    patch({ playing: true, error: null })
    requestWakeLock()
    syncMediaSessionFromState(_state)
  } else {
    patch({ buffering: true })
    const onReady = () => {
      audio.removeEventListener('canplay', onReady)
      if (generation !== _handlerGeneration) return
      audio.play().catch(() => patch({ error: 'Play blocked — tap to start' }))
      patch({ playing: true, buffering: false })
      requestWakeLock()
      syncMediaSessionFromState(_state)
    }
    audio.addEventListener('canplay', onReady, { once: true })
  }
}

export function stop(options?: StopOptions): void {
  const generation = bumpSession()
  clearSnippetTimer()
  releaseWakeLock()

  if (_audio) {
    _audio.pause()
    _audio.onloadedmetadata = null
    _audio.ontimeupdate = null
    _audio.onended = null
    _audio.onerror = null
  }

  const clearQueue = options?.clearQueue === true
  patch({
    mode: 'idle',
    playing: false,
    buffering: false,
    currentTime: 0,
    progress: 0,
    snippet: null,
    error: null,
    ...(clearQueue ? { queue: [], queueIndex: 0 } : {}),
  })

  if (generation === _handlerGeneration) {
    syncMediaSessionFromState(_state)
    if (_state.mode === 'idle') {
      clearMediaSessionHandlers()
    }
  }
}

// ── Public API: seek ──────────────────────────────────────────────

export function seekSnippetProgress(pct: number): void {
  if (_state.mode !== 'snippet' || !_state.snippet || !_audio) return
  const { startSec, endSec } = _state.snippet
  const span = endSec - startSec
  if (span <= 0) return
  const clamped = Math.max(0, Math.min(100, pct))
  const t = startSec + (clamped / 100) * span
  _audio.currentTime = t
  patch({ currentTime: t })
}

export function playFullSeek(sec: number): void {
  if (_state.mode !== 'full' || !_audio) return
  const t = Math.max(0, sec)
  _audio.currentTime = t
  patch({ currentTime: t })
  if (!_state.playing) {
    togglePlayPause()
  }
}

// ── Public API: queue ─────────────────────────────────────────────

export function setQueue(items: LyricMomentQueueItem[], index: number): void {
  const safeIndex = items.length === 0 ? 0 : Math.max(0, Math.min(index, items.length - 1))
  patch({ queue: items, queueIndex: safeIndex })
}

export function queueNext(): void {
  const { queue, queueIndex } = _state
  if (queueIndex >= queue.length - 1) return
  const nextIndex = queueIndex + 1
  patch({ queueIndex: nextIndex })
  const item = queue[nextIndex]
  if (item) void playSnippet(queueItemToSnippetRequest(item, 'mini-player'))
}

export function queuePrev(): void {
  const { queue, queueIndex } = _state
  if (queueIndex <= 0) return
  const prevIndex = queueIndex - 1
  patch({ queueIndex: prevIndex })
  const item = queue[prevIndex]
  if (item) void playSnippet(queueItemToSnippetRequest(item, 'mini-player'))
}

// ── Public API: preload ───────────────────────────────────────────

export function preloadSong(songId: string, audioUrl: string): void {
  registerPreloadSong(songId, audioUrl)
}

export function warmUrl(audioUrl: string): void {
  warmPreloadUrl(audioUrl)
}

// ── Public API: volume ────────────────────────────────────────────

export function setVolume(vol: number): void {
  const v = Math.max(0, Math.min(1, vol))
  patch({ volume: v, muted: v === 0 })
  if (_audio) _audio.volume = v
}

export function toggleMute(): void {
  const muted = !_state.muted
  patch({ muted })
  if (_audio) _audio.volume = muted ? 0 : _state.volume
}

// ── Aggregate export (spec §2.3) ─────────────────────────────────

export const audioEngine = {
  subscribe: subscribeAudioEngine,
  getState: getAudioEngineState,
  attachAudioElement,
  playSnippet,
  playFull,
  togglePlayPause,
  stop,
  seekSnippetProgress,
  playFullSeek,
  setQueue,
  queueNext,
  queuePrev,
  preloadSong,
  warmUrl,
  setVolume,
  toggleMute,
}
