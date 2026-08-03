/**
 * Margo AudioEngine — dual DOM <audio> controller (module singleton)
 * @see docs/TARGET_ARCHITECTURE_AUDIO_ENGAGEMENT.md Section 2.3–2.4
 *
 * CROSSFADE NOTE: this engine now drives TWO <audio> elements instead of
 * one. Only one is ever "active" (the one requireAudio()/activeAudio()
 * returns, and the one all normal playback functions operate on) — the
 * second only comes alive during the ~800ms window where the engine is
 * handing off from one queued snippet to the next, so a Mixtape/Moments
 * queue crossfades smoothly instead of hard-cutting between lines.
 *
 * FIX (post-review): the inactive element is now pre-buffered as soon as
 * a crossfade is *scheduled* (armSnippetTimer), not only when the fade
 * actually *begins* 800ms before the end. This avoids a dead-air gap if
 * the next track hasn't finished loading by the time the fade curve
 * starts ramping its volume up.
 *
 * FIX (post-review): setVolume()/toggleMute() changes made mid-crossfade
 * now take effect immediately — the fade loop reads live volume/mute
 * state every frame instead of a value captured once at fade start.
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
import { recordQualifiedPlay, getPlayThresholdSec } from '@/lib/engagement/plays'

// ── Module state ──────────────────────────────────────────────────

let _state: AudioEngineState = { ...INITIAL_AUDIO_ENGINE_STATE }

// Two elements instead of one. _activeIsA tracks which one is currently
// "the" player that all normal playback code operates on via
// activeAudio()/requireAudio(). The other one is silent and idle except
// during the brief crossfade window.
let _audioA: HTMLAudioElement | null = null
let _audioB: HTMLAudioElement | null = null
let _activeIsA = true

let _listeners = new Set<AudioEngineListener>()
let _snippetTimer: ReturnType<typeof setTimeout> | null = null
let _handlerGeneration = 0
let _wakeLock: WakeLockSentinel | null = null
let _qualifiedPlayFired = false

// ── Crossfade state ────────────────────────────────────────────────

// How long the overlap between an ending snippet and the next queued one
// lasts. 800ms is a deliberate middle ground: long enough to feel like a
// real transition instead of a click, short enough that it doesn't blur
// two short lyric lines into each other or eat into either one's meaning.
const CROSSFADE_MS = 800
// If a snippet is shorter than this, there isn't enough runway to fit a
// clean fade — the engine falls back to the old hard-stop-then-advance
// behavior for that transition instead of overlapping awkwardly.
const MIN_SNIPPET_MS_FOR_CROSSFADE = CROSSFADE_MS * 1.5

let _crossfadeTimer: ReturnType<typeof setTimeout> | null = null
let _crossfadeRAF: number | null = null
let _crossfadeActive = false

function activeAudio(): HTMLAudioElement | null {
  return _activeIsA ? _audioA : _audioB
}

function inactiveAudio(): HTMLAudioElement | null {
  return _activeIsA ? _audioB : _audioA
}

function clearCrossfadeTimer(): void {
  if (_crossfadeTimer) {
    clearTimeout(_crossfadeTimer)
    _crossfadeTimer = null
  }
  if (_crossfadeRAF !== null) {
    cancelAnimationFrame(_crossfadeRAF)
    _crossfadeRAF = null
  }
}

// Called whenever a fresh, explicit playback action starts (a new
// playSnippet/playFull call, or stop()) — this guarantees a crossfade
// that got interrupted (e.g. someone taps "Next" mid-fade) can't leave
// the other element quietly playing in the background afterward.
function cancelCrossfade(): void {
  clearCrossfadeTimer()
  if (!_crossfadeActive) return
  _crossfadeActive = false
  const other = inactiveAudio()
  if (other) {
    other.pause()
    other.volume = 0
  }
}

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
  cancelCrossfade()
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
  const el = activeAudio()
  if (!el) {
    throw new Error('[AudioEngine] No audio element attached — mount AudioEngineProvider first')
  }
  return el
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
    if (
      _state.mode === 'full' &&
      _state.songId &&
      !_qualifiedPlayFired &&
      audio.currentTime >= getPlayThresholdSec(audio.duration)
    ) {
      _qualifiedPlayFired = true
      void recordQualifiedPlay(_state.songId)
    }
    /* Snippet: clamp stop at endSec (timer is primary; this guards drift).
       Skipped while a crossfade is in progress — the crossfade's own
       finishCrossfade() is what ends this element, not this clamp, and
       firing both would double-advance the queue. */
    if (_state.mode === 'snippet' && _state.snippet && _state.playing && !_crossfadeActive) {
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

// Auto-advance fallback: runs when a snippet ends with no crossfade in
// play (either there was no next queue item, or the snippet was too
// short to fit one — see MIN_SNIPPET_MS_FOR_CROSSFADE). Still checks for
// a next queue item so a short-clip Mixtape still plays all the way
// through, just with a hard cut instead of a fade for that one transition.
function pauseSnippetAtEnd(): void {
  const audio = activeAudio()
  if (!audio) return
  clearSnippetTimer()
  audio.pause()
  releaseWakeLock()
  patch({ playing: false })
  syncMediaSessionFromState(_state)

  const { queue, queueIndex } = _state
  if (queue.length > 0 && queueIndex < queue.length - 1) {
    queueNext()
  }
}

// ── Crossfade ──────────────────────────────────────────────────────

// FIX: pre-buffer the next queued track on the inactive element as soon
// as a crossfade is scheduled (called from armSnippetTimer), rather than
// waiting until beginCrossfade fires 800ms before the end. This gives the
// browser the full remaining snippet duration (not just 800ms) to fetch
// and decode the next file, so by the time the fade actually starts,
// the incoming element can play immediately instead of stalling silently
// under a rising volume ramp.
function preloadInactiveForCrossfade(nextItem: LyricMomentQueueItem): void {
  const incoming = inactiveAudio()
  if (!incoming) return
  const sameSrc =
    incoming.src === nextItem.audioUrl ||
    incoming.src === new URL(nextItem.audioUrl, window.location.href).href
  if (!sameSrc) {
    incoming.pause()
    incoming.src = nextItem.audioUrl
    incoming.volume = 0
    incoming.load()
  }
}

// Fires ~CROSSFADE_MS before the current snippet's natural end (scheduled
// by armSnippetTimer below). Starts the next queued snippet quietly on
// the currently-inactive element, then ramps volumes across both
// elements using an equal-power curve (cos/sin quarter-waves) so the
// combined perceived loudness stays roughly constant through the fade,
// instead of the audible dip a straight linear fade produces.
function beginCrossfade(generation: number): void {
  if (generation !== _handlerGeneration) return

  const { queue, queueIndex } = _state
  const nextIndex = queueIndex + 1
  const nextItem = queue[nextIndex]
  const outgoing = activeAudio()
  const incoming = inactiveAudio()

  if (!nextItem || !outgoing || !incoming) {
    pauseSnippetAtEnd()
    return
  }

  _crossfadeActive = true

  // Should already be preloaded via preloadInactiveForCrossfade(), called
  // when this crossfade was scheduled — this is just a safety net in case
  // the queue changed since then.
  const sameSrc =
    incoming.src === nextItem.audioUrl ||
    incoming.src === new URL(nextItem.audioUrl, window.location.href).href
  if (!sameSrc) {
    incoming.pause()
    incoming.src = nextItem.audioUrl
    incoming.load()
  }
  try { incoming.currentTime = nextItem.startSec } catch { /* best effort if not ready yet */ }
  incoming.volume = 0
  const incomingPlay = incoming.play()
  incomingPlay.catch(() => {
    // If the browser blocks this (rare mid-session, since the page
    // already has an active playback gesture unlocking audio), the fade
    // below still completes and the metadata/queue position still hands
    // off correctly — the person just may need one tap to resume sound.
  })

  const startTime = performance.now()
  const step = (now: number) => {
    if (generation !== _handlerGeneration) return
    // FIX: read volume/mute live each frame instead of a value captured
    // once at fade start, so a mid-fade volume/mute change takes effect
    // immediately instead of waiting for the fade to finish.
    const liveTarget = _state.muted ? 0 : _state.volume
    const t = Math.min(1, (now - startTime) / CROSSFADE_MS)
    outgoing.volume = Math.cos((t * Math.PI) / 2) * liveTarget
    incoming.volume = Math.sin((t * Math.PI) / 2) * liveTarget
    if (t < 1) {
      _crossfadeRAF = requestAnimationFrame(step)
    } else {
      finishCrossfade(generation, nextItem, nextIndex, outgoing, incoming)
    }
  }
  _crossfadeRAF = requestAnimationFrame(step)
}

// Completes the handoff: the outgoing element is fully silenced and
// paused, the incoming element becomes the new "active" element, and the
// engine's public state (title/artist/artwork/snippet/queueIndex) swaps
// over to the new track in one atomic patch — so the mini-player and any
// UI reading engine state update in sync with what's actually audible.
function finishCrossfade(
  generation: number,
  nextItem: LyricMomentQueueItem,
  nextIndex: number,
  outgoing: HTMLAudioElement,
  incoming: HTMLAudioElement,
): void {
  clearCrossfadeTimer()
  _crossfadeActive = false

  outgoing.pause()
  outgoing.volume = 0
  _activeIsA = !_activeIsA
  incoming.volume = _state.muted ? 0 : _state.volume

  const snippet: SnippetBounds = {
    startSec: nextItem.startSec,
    endSec: nextItem.endSec,
    lineIndex: nextItem.lineIndex,
    lineText: nextItem.lineText,
  }

  patch({
    songId: nextItem.songId,
    audioUrl: nextItem.audioUrl,
    title: nextItem.title,
    artist: nextItem.artist,
    artwork: nextItem.artwork ?? null,
    vibe: nextItem.vibe ?? null,
    snippet,
    queueIndex: nextIndex,
    currentTime: nextItem.startSec,
    playing: true,
    error: null,
  })

  bindAudioHandlers(generation)
  syncMediaSessionFromState(_state)
  armSnippetTimer(generation)
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
  clearCrossfadeTimer()
  const snippet = _state.snippet
  if (!snippet || _state.mode !== 'snippet') return
  const ms = getSnippetStopDurationMs(snippet.startSec, snippet.endSec)

  const { queue, queueIndex } = _state
  const hasNext = queue.length > 0 && queueIndex < queue.length - 1

  if (hasNext && ms >= MIN_SNIPPET_MS_FOR_CROSSFADE) {
    // FIX: kick off pre-buffering on the inactive element right away —
    // don't wait for the crossfade window itself to start loading it.
    const nextItem = queue[queueIndex + 1]
    if (nextItem) preloadInactiveForCrossfade(nextItem)

    // Schedule a smooth handoff to the next queued moment instead of a
    // hard stop — beginCrossfade fires early enough that the fade
    // finishes right as this snippet's natural end arrives.
    const crossfadeStartDelay = ms - CROSSFADE_MS
    _crossfadeTimer = setTimeout(() => {
      if (generation !== _handlerGeneration) return
      beginCrossfade(generation)
    }, crossfadeStartDelay)
  } else {
    _snippetTimer = setTimeout(() => {
      if (generation !== _handlerGeneration) return
      pauseSnippetAtEnd()
    }, ms)
  }
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

// Attaches BOTH audio elements the AudioEngineProvider mounts. elA
// starts as the active/audible element; elB starts silent and idle,
// only becoming audible during a crossfade.
export function attachAudioElements(elA: HTMLAudioElement, elB: HTMLAudioElement): void {
  _audioA = elA
  _audioB = elB
  _activeIsA = true
  ;[elA, elB].forEach(el => {
    el.preload = 'auto'
    el.setAttribute('playsinline', '')
  })
  elA.volume = _state.muted ? 0 : _state.volume
  elB.volume = 0
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

  const audio = requireAudio()

  // ── Mobile-first gesture fix ──────────────────────────────────────
  // ALL mobile browsers (iOS Safari, Android Chrome, Android Firefox) block
  // audio.play() if it is not called synchronously within the user gesture.
  // Any `await` before play() breaks the gesture chain.
  //
  // Strategy: set src + seek synchronously, then call play() immediately
  // within the same tick. The browser suspends the play promise while
  // buffering and resumes it automatically — this works on all platforms.
  // We do NOT await prepareSource before play(). Instead we let play()
  // start buffering, then monitor readyState in the background.

  const sameSrc =
    audio.src === request.audioUrl ||
    audio.src === new URL(request.audioUrl, window.location.href).href

  if (!sameSrc) {
    audio.pause()
    audio.src = request.audioUrl
    audio.load()
  }

  // Seek to snippet start synchronously
  try { audio.currentTime = request.startSec } catch { /* ignore if not ready yet */ }

  bindAudioHandlers(generation)
  bindMediaSessionHandlers()
  syncMediaSessionFromState(_state)
  patch({ buffering: audio.readyState < 2 })

  // Call play() NOW — still within the user gesture call stack
  const playPromise = audio.play()

  patch({ playing: true, error: null })
  requestWakeLock()
  syncMediaSessionFromState(_state)

  // The snippet timer (and, if applicable, the crossfade it schedules)
  // only starts counting once playback is actually confirmed audible —
  // starting it the instant play() was called meant any real buffering
  // delay made snippets sound like they cut off early, since the timer's
  // clock and the audible playback clock disagreed.

  // Handle play promise result in background — does not block gesture
  playPromise.then(() => {
    if (generation !== _handlerGeneration) return
    patch({ buffering: false, error: null })
    // Re-seek if currentTime drifted during buffer
    if (Math.abs(audio.currentTime - request.startSec) > 1) {
      audio.currentTime = request.startSec
    }
    armSnippetTimer(generation)
  }).catch(() => {
    if (generation !== _handlerGeneration) return
    patch({ playing: false, buffering: false, error: 'Play blocked — tap to start' })
  })
}

export async function playFull(request: PlayFullRequest): Promise<void> {
  const generation = bumpSession()
  _qualifiedPlayFired = false
  clearSnippetTimer()
  releaseWakeLock()

  const startSec = request.startSec ?? 0
  applyTrackMetadata(request, 'full', null)
  registerPreloadSong(request.songId, request.audioUrl)

  const audio = requireAudio()

  const sameSrc =
    audio.src === request.audioUrl ||
    audio.src === new URL(request.audioUrl, window.location.href).href

  if (!sameSrc) {
    audio.pause()
    audio.src = request.audioUrl
    audio.load()
  }

  bindAudioHandlers(generation)

  if (request.autoplay) {
    // ── Mobile-first gesture fix ────────────────────────────────────
    // Call play() synchronously within the user gesture — no await before it.
    // Works on iOS Safari, Android Chrome, Android Firefox, and desktop.
    try { audio.currentTime = startSec } catch { /* ignore */ }

    bindMediaSessionHandlers()
    syncMediaSessionFromState(_state)
    patch({ buffering: audio.readyState < 2 })

    const playPromise = audio.play()

    patch({ playing: true, error: null })
    requestWakeLock()
    syncMediaSessionFromState(_state)

    playPromise.then(() => {
      if (generation !== _handlerGeneration) return
      patch({ buffering: false, error: null })
    }).catch(() => {
      if (generation !== _handlerGeneration) return
      patch({ playing: false, buffering: false, error: 'Play blocked — tap to start' })
    })
  } else {
    // No autoplay — just buffer and wait for user tap
    try { audio.currentTime = startSec } catch { /* ignore */ }
    patch({ playing: false, buffering: false, currentTime: startSec })
    syncMediaSessionFromState(_state)
    // Start buffering in background so first tap is instant
    if (audio.readyState < 2) {
      patch({ buffering: true })
      const onReady = () => {
        audio.removeEventListener('canplay', onReady)
        if (generation !== _handlerGeneration) return
        patch({ buffering: false })
      }
      audio.addEventListener('canplay', onReady, { once: true })
    }
  }
}

export function togglePlayPause(): void {
  const audio = activeAudio()
  if (_state.mode === 'idle' || !audio) return

  if (_state.playing) {
    audio.pause()
    clearSnippetTimer()
    releaseWakeLock()
    patch({ playing: false })
    syncMediaSessionFromState(_state)
    return
  }

  const generation = _handlerGeneration

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

  /* full mode — call play() immediately on gesture stack, let browser buffer while playing */
  bindMediaSessionHandlers()
  syncMediaSessionFromState(_state)
  audio.play().catch(() => patch({ error: 'Play blocked — tap to start' }))
  patch({ playing: true, error: null })
  requestWakeLock()
  syncMediaSessionFromState(_state)
}

export function stop(options?: StopOptions): void {
  const generation = bumpSession()
  clearSnippetTimer()
  releaseWakeLock()

  ;[_audioA, _audioB].forEach(el => {
    if (!el) return
    el.pause()
    el.onloadedmetadata = null
    el.ontimeupdate = null
    el.onended = null
    el.onerror = null
  })
  _activeIsA = true
  if (_audioA) _audioA.volume = _state.muted ? 0 : _state.volume
  if (_audioB) _audioB.volume = 0

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
  const audio = activeAudio()
  if (_state.mode !== 'snippet' || !_state.snippet || !audio) return
  const { startSec, endSec } = _state.snippet
  const span = endSec - startSec
  if (span <= 0) return
  const clamped = Math.max(0, Math.min(100, pct))
  const t = startSec + (clamped / 100) * span
  audio.currentTime = t
  patch({ currentTime: t })
}

export function playFullSeek(sec: number): void {
  const audio = activeAudio()
  if (_state.mode !== 'full' || !audio) return
  const t = Math.max(0, sec)
  audio.currentTime = t
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
  const audio = activeAudio()
  if (audio) audio.volume = v
}

export function toggleMute(): void {
  const muted = !_state.muted
  patch({ muted })
  const audio = activeAudio()
  if (audio) audio.volume = muted ? 0 : _state.volume
}

// ── Aggregate export (spec §2.3) ─────────────────────────────────

export const audioEngine = {
  subscribe: subscribeAudioEngine,
  getState: getAudioEngineState,
  attachAudioElements,
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