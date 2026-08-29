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
  isFullQueueItem,
  isSnippetQueueItem,
  queueItemToFullRequest,
  queueItemToSnippetRequest,
} from './types'
import { syncMediaSessionFromState, bindMediaSessionHandlers, clearMediaSessionHandlers } from './media-session'
import {
  getPreloadReadyState,
  recycleElementToPool,
  registerPreloadSong,
  takeBufferedPoolElement,
  warmPreloadUrl,
} from './preload-cache'
import { recordQualifiedPlay, getPlayThresholdSec } from '@/lib/engagement/plays'
import { livingAtmosphereOrNull } from '@/lib/atmosphere'

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

// FIX (post-review): previously the engine only attempted a crossfade if
// a snippet's own duration cleared a fixed 1.2s floor (CROSSFADE_MS * 1.5).
// A Lyric Moment can legally be as short as 4 words — well under a
// second in many cases — so any Mixtape whose lines happened to be short
// silently got zero crossfades, every transition, while a Mixtape with
// longer lines faded smoothly. That looked like "some mixtapes just don't
// transition" when it was really "any snippet under ~1.2s never got a
// chance." Now the crossfade duration itself scales to each snippet — a
// fraction of its own length, clamped between a small floor and the
// original ceiling — so every transition gets a proportional fade
// consistently, regardless of how short or long that particular line is.
const CROSSFADE_MAX_MS = 800
const CROSSFADE_MIN_MS = 250
const CROSSFADE_FRACTION = 0.35
// Only truly degenerate snippets (well under half a second) skip the
// fade entirely and fall back to a hard cut — there's no meaningful
// overlap to build even at the floor duration.
const MIN_SNIPPET_MS_FOR_ANY_CROSSFADE = 400

function computeCrossfadeMs(snippetMs: number): number {
  return Math.max(CROSSFADE_MIN_MS, Math.min(CROSSFADE_MAX_MS, snippetMs * CROSSFADE_FRACTION))
}

let _crossfadeTimer: ReturnType<typeof setTimeout> | null = null
let _crossfadeRAF: number | null = null
let _crossfadeActive = false

// FIX: audio URLs that have failed to play at least once this "session"
// (i.e. since the last setQueue or a full stop). A large Vibe Mixtape can
// easily include one song with a broken/missing/unreachable file, and
// without this, the engine had no way to recover — it would either die
// silently on that track, or (worse) loop forever retrying the exact same
// broken URL via queueNext(). Every place that decides "what's next in
// the queue" now routes through findNextPlayableIndex(), which walks
// forward and skips anything already known to be broken. Monotonic and
// naturally bounded — no retry counters or recursion-depth caps needed.
let _brokenAudioUrls = new Set<string>()

/**
 * Finds the first playable (not known-broken) queue index at or after
 * `fromIndex`. Returns -1 if nothing playable remains.
 */
function findNextPlayableIndex(fromIndex: number): number {
  const { queue } = _state
  for (let i = fromIndex; i < queue.length; i++) {
    if (!_brokenAudioUrls.has(queue[i].audioUrl)) return i
  }
  return -1
}

// FIX: the crossfade's in-flight context, lifted out of beginCrossfade's
// local scope so other public actions (pause, seek) can resolve an
// in-progress fade deterministically instead of colliding with it. Without
// this, tapping pause mid-fade only paused the outgoing track — the
// incoming track kept ramping up untouched in the background, and the
// scheduled finishCrossfade() would then unconditionally set playing:true
// again a moment later, silently undoing the pause.
let _cfGeneration: number | null = null
let _cfNextItem: LyricMomentQueueItem | null = null
let _cfNextIndex: number | null = null
let _cfOutgoing: HTMLAudioElement | null = null
let _cfIncoming: HTMLAudioElement | null = null

function clearCrossfadeContext(): void {
  _cfGeneration = null
  _cfNextItem = null
  _cfNextIndex = null
  _cfOutgoing = null
  _cfIncoming = null
}

// FIX: rapid play/pause taps race against the browser's async play()
// promise. If you tap resume, then tap pause again before that play()
// promise resolves, the pause happens immediately — but the earlier
// play()'s .then() callback has no idea a newer tap happened, and fires
// later, silently overwriting state back to playing:true. That's what
// made rapid tapping feel "stuck" or "confused." Every togglePlayPause()
// call now stamps a token; async callbacks check it's still current
// before applying anything, so a stale resolution can never clobber a
// newer tap's result.
let _toggleToken = 0

/**
 * If a crossfade is currently in flight, snap it to completion right now
 * instead of letting it keep animating. Called at the top of any action
 * that needs a single, settled "active" element to operate on — pause,
 * seek — so the action lands on a track that won't get silently
 * overridden a few hundred ms later when the fade would have finished
 * on its own.
 */
function resolveCrossfadeNow(): void {
  if (!_crossfadeActive) return
  if (_cfGeneration === null || !_cfNextItem || _cfNextIndex === null || !_cfOutgoing || !_cfIncoming) {
    cancelCrossfade()
    return
  }
  finishCrossfade(_cfGeneration, _cfNextItem, _cfNextIndex, _cfOutgoing, _cfIncoming)
}

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
  clearCrossfadeContext()
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
    // D4: advance to next queue item, or stop (leave paused at end — no auto-radio)
    const { queue, queueIndex } = _state
    if (queue.length > 0 && findNextPlayableIndex(queueIndex + 1) !== -1) {
      queueNext()
    }
  }

  audio.onerror = () => {
    if (generation !== _handlerGeneration) return
    clearSnippetTimer()
    releaseWakeLock()
    // FIX: previously this just set an error and stopped — one broken
    // file anywhere in a large mixtape would silently kill playback for
    // everything after it. Now: mark this URL broken so nothing retries
    // it, then auto-advance to the next genuinely playable queue item.
    if (_state.audioUrl) _brokenAudioUrls.add(_state.audioUrl)
    patch({ playing: false, buffering: false, error: 'Playback failed — skipping' })
    const { queue, queueIndex } = _state
    const nextPlayable = findNextPlayableIndex(queueIndex + 1)
    if (nextPlayable !== -1) {
      patch({ queueIndex: nextPlayable, error: null })
      playQueueItem(queue[nextPlayable])
    }
  }
}

// Auto-advance fallback: runs when a snippet ends with no crossfade in
// play (either there was no next queue item, or the snippet was too
// short to fit any meaningful overlap. Still checks for
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
function urlsMatch(elementSrc: string, audioUrl: string): boolean {
  if (!elementSrc || !audioUrl) return false
  if (elementSrc === audioUrl) return true
  try {
    const resolved = new URL(audioUrl, window.location.href).href
    return elementSrc === resolved
  } catch {
    return false
  }
}

/**
 * Promote a pool-buffered <audio> into the active A/B slot so playback
 * reuses in-memory data instead of cold-fetching on the main element.
 */
function promotePooledToActive(audioUrl: string): boolean {
  const pooled = takeBufferedPoolElement(audioUrl)
  if (!pooled) return false

  const active = activeAudio()
  if (!active) return false

  pooled.muted = false
  pooled.volume = _state.muted ? 0 : _state.volume
  pooled.preload = 'auto'
  pooled.setAttribute('playsinline', '')
  pooled.style.display = 'none'

  const parent = active.parentNode
  if (parent) parent.replaceChild(pooled, active)

  recycleElementToPool(active)

  if (_activeIsA) _audioA = pooled
  else _audioB = pooled

  return true
}

/** Set active element src, preferring a warmed pool handoff when available. */
function assignSourceForPlayback(audioUrl: string): void {
  const audio = activeAudio()
  if (!audio) return
  if (urlsMatch(audio.src, audioUrl)) return

  if (promotePooledToActive(audioUrl)) return

  audio.pause()
  audio.src = audioUrl
  if (getPreloadReadyState(audioUrl) < 2) {
    audio.load()
  }
}

function preloadInactiveForCrossfade(nextItem: LyricMomentQueueItem): void {
  warmPreloadUrl(nextItem.audioUrl)
  const incoming = inactiveAudio()
  if (!incoming) return
  if (urlsMatch(incoming.src, nextItem.audioUrl)) return
  incoming.pause()
  incoming.src = nextItem.audioUrl
  incoming.volume = 0
  if (getPreloadReadyState(nextItem.audioUrl) < 2) {
    incoming.load()
  }
}

// Fires shortly before the current snippet's natural end (scheduled
// by armSnippetTimer below). Starts the next queued snippet quietly on
// the currently-inactive element, then ramps volumes across both
// elements using an equal-power curve (cos/sin quarter-waves) so the
// combined perceived loudness stays roughly constant through the fade,
// instead of the audible dip a straight linear fade produces.
function beginCrossfade(generation: number, durationMs: number): void {
  if (generation !== _handlerGeneration) return

  const { queue, queueIndex } = _state
  const nextIndex = findNextPlayableIndex(queueIndex + 1)
  const nextItem = nextIndex !== -1 ? queue[nextIndex] : undefined
  const outgoing = activeAudio()
  const incoming = inactiveAudio()

  // Crossfade is snippet→snippet only. Mixed / full next = hard cut via queueNext.
  if (!nextItem || !outgoing || !incoming || !isSnippetQueueItem(nextItem)) {
    pauseSnippetAtEnd()
    return
  }

  _crossfadeActive = true
  _cfGeneration = generation
  _cfNextItem = nextItem
  _cfNextIndex = nextIndex
  _cfOutgoing = outgoing
  _cfIncoming = incoming

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
    // FIX: previously this was a silent no-op — the fade would keep
    // animating volumes on an element that never actually started
    // playing, ending in dead air on the incoming track while state
    // still said playing:true. Now: abort this crossfade attempt
    // cleanly, restore the outgoing track to full volume (it's still
    // legitimately playing — no reason to lose it), and fall back to
    // the normal end-of-snippet timer so the queue still advances,
    // just with a hard cut for this one transition instead of a fade.
    if (generation !== _handlerGeneration) return
    if (!_crossfadeActive) return
    _brokenAudioUrls.add(nextItem.audioUrl)
    cancelCrossfade()
    outgoing.volume = _state.muted ? 0 : _state.volume
    armSnippetTimer(generation)
  })

  const startTime = performance.now()
  const step = (now: number) => {
    if (generation !== _handlerGeneration) return
    // FIX: read volume/mute live each frame instead of a value captured
    // once at fade start, so a mid-fade volume/mute change takes effect
    // immediately instead of waiting for the fade to finish.
    const liveTarget = _state.muted ? 0 : _state.volume
    const t = Math.min(1, (now - startTime) / durationMs)
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
  clearCrossfadeContext()

  outgoing.pause()
  outgoing.volume = 0
  // FIX: clear this element's handlers now that it's going inactive. It
  // will very likely be reused as the *incoming* element for the next
  // queued crossfade (see preloadInactiveForCrossfade / beginCrossfade),
  // and without this, its stale onloadedmetadata/ontimeupdate/onended/
  // onerror handlers stay live — the generation guard inside them doesn't
  // block them, since no new session started — and they fire against
  // state that now belongs to a different, newly-active track. That
  // mismatch is what caused every transition after the first one in a
  // queue to misbehave (premature stop, corrupted currentTime/duration,
  // or the queue silently failing to advance).
  outgoing.onloadedmetadata = null
  outgoing.ontimeupdate = null
  outgoing.onended = null
  outgoing.onerror = null
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
    atmosphere: livingAtmosphereOrNull(nextItem.atmosphere),
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

// ── Snippet timer (Section 2.6 — single source) ───────────────────

function armSnippetTimer(generation: number): void {
  clearSnippetTimer()
  clearCrossfadeTimer()
  const snippet = _state.snippet
  if (!snippet || _state.mode !== 'snippet') return
  const ms = getSnippetStopDurationMs(snippet.startSec, snippet.endSec)

  const { queue, queueIndex } = _state
  const nextPlayableIndex = findNextPlayableIndex(queueIndex + 1)
  const hasNext = nextPlayableIndex !== -1
  const nextItem = hasNext ? queue[nextPlayableIndex] : null
  // Only schedule crossfade when the next item is also a snippet window.
  // Snippet → full (or end) uses hard cut: play window, then advance (no auto-expand).
  const canCrossfade = hasNext && nextItem && isSnippetQueueItem(nextItem) && ms >= MIN_SNIPPET_MS_FOR_ANY_CROSSFADE

  if (canCrossfade && nextItem) {
    // FIX: kick off pre-buffering on the inactive element right away —
    // don't wait for the crossfade window itself to start loading it.
    preloadInactiveForCrossfade(nextItem)

    // Duration scales to THIS snippet's own length — a short lyric line
    // gets a short, proportional fade instead of no fade at all; a long
    // one gets the full 800ms. Schedule fires early enough that the fade
    // finishes right as this snippet's natural end arrives.
    const crossfadeDurationMs = computeCrossfadeMs(ms)
    const crossfadeStartDelay = ms - crossfadeDurationMs
    _crossfadeTimer = setTimeout(() => {
      if (generation !== _handlerGeneration) return
      beginCrossfade(generation, crossfadeDurationMs)
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
  req: (Pick<PlaySnippetRequest, 'songId' | 'audioUrl' | 'title' | 'artist' | 'artwork'> & { vibe?: string | null; atmosphere?: string | null }) | (Pick<PlayFullRequest, 'songId' | 'audioUrl' | 'title' | 'artist' | 'artwork'> & { atmosphere?: string | null }),
  mode: AudioEngineState['mode'],
  snippet: SnippetBounds | null,
): void {
  const atmosphere = livingAtmosphereOrNull('atmosphere' in req ? req.atmosphere : null)
  patch({
    mode,
    songId: req.songId,
    audioUrl: req.audioUrl,
    title: req.title,
    artist: req.artist,
    artwork: req.artwork ?? null,
    vibe: ('vibe' in req ? req.vibe : null) ?? null,
    atmosphere,
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

  assignSourceForPlayback(request.audioUrl)

  const audio = requireAudio()

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

/** Pause if this snippet is already the active session; otherwise start it. */
export function playOrToggleSnippet(request: PlaySnippetRequest): void {
  const s = getAudioEngineState()
  const sn = s.snippet
  const sameTrack = s.mode === 'snippet' && s.songId === request.songId
  const sameSnippet = !!sn && (
    (!!request.lineText && sn.lineText === request.lineText) ||
    sn.lineIndex === request.lineIndex ||
    (sn.startSec === request.startSec && sn.endSec === request.endSec)
  )
  if (sameTrack && sameSnippet) {
    togglePlayPause()
    return
  }
  void playSnippet(request)
}

export async function playFull(request: PlayFullRequest): Promise<void> {
  const generation = bumpSession()
  _qualifiedPlayFired = false
  clearSnippetTimer()
  releaseWakeLock()

  const startSec = request.startSec ?? 0
  applyTrackMetadata(request, 'full', null)
  registerPreloadSong(request.songId, request.audioUrl)

  assignSourceForPlayback(request.audioUrl)

  const audio = requireAudio()

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
  // FIX: if a crossfade is mid-flight, snap it to completion first. Without
  // this, pausing during a fade only paused the outgoing track — the
  // incoming track kept ramping up in the background — and the scheduled
  // finishCrossfade() would then set playing:true again a moment later,
  // silently undoing the pause the person just did.
  resolveCrossfadeNow()

  // FIX: every call gets its own token. Any earlier in-flight play()
  // promise's callbacks check this before applying their result — so
  // rapid pause→play→pause taps can't have a stale resolution land after
  // a newer tap and silently override it.
  const toggleToken = ++_toggleToken

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
        if (toggleToken !== _toggleToken) return
        patch({ playing: true, error: null })
        requestWakeLock()
        armSnippetTimer(generation)
        syncMediaSessionFromState(_state)
      })
      .catch(() => {
        if (toggleToken !== _toggleToken) return
        patch({ error: 'Play blocked — tap to start' })
      })
    return
  }

  /* full mode — call play() immediately on gesture stack, let browser buffer while playing */
  bindMediaSessionHandlers()
  syncMediaSessionFromState(_state)
  audio.play().catch(() => {
    if (toggleToken !== _toggleToken) return
    patch({ error: 'Play blocked — tap to start' })
  })
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
  if (clearQueue) _brokenAudioUrls.clear()
  patch({
    mode: 'idle',
    playing: false,
    buffering: false,
    currentTime: 0,
    progress: 0,
    snippet: null,
    error: null,
    atmosphere: null,
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
  resolveCrossfadeNow()
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
  resolveCrossfadeNow()
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

/**
 * Play the given queue item according to its kind.
 * Snippet → window only, then advance. Full → whole file, then advance/stop.
 * Never auto-expands a snippet into the full track.
 */
export function playQueueItem(item: LyricMomentQueueItem): void {
  if (isFullQueueItem(item)) {
    void playFull(queueItemToFullRequest(item, 'karaoke'))
  } else {
    void playSnippet(queueItemToSnippetRequest(item, 'mini-player'))
  }
}

export function setQueue(items: LyricMomentQueueItem[], index: number): void {
  _brokenAudioUrls.clear()
  const safeIndex = items.length === 0 ? 0 : Math.max(0, Math.min(index, items.length - 1))
  patch({ queue: items, queueIndex: safeIndex })
}

export function queueNext(): void {
  const { queue, queueIndex } = _state
  const nextPlayable = findNextPlayableIndex(queueIndex + 1)
  if (nextPlayable === -1) return
  patch({ queueIndex: nextPlayable })
  const item = queue[nextPlayable]
  if (item) playQueueItem(item)
}

export function queuePrev(): void {
  const { queue, queueIndex } = _state
  if (queueIndex <= 0) return
  const prevIndex = queueIndex - 1
  patch({ queueIndex: prevIndex })
  const item = queue[prevIndex]
  if (item) playQueueItem(item)
}

/** Jump to an absolute queue index and play that item. */
export function playQueueIndex(index: number): void {
  const { queue } = _state
  if (index < 0 || index >= queue.length) return
  const item = queue[index]
  if (!item) return
  patch({ queueIndex: index })
  playQueueItem(item)
}

/**
 * Remove one queue row. If it was current, play the item that lands in its
 * slot (or stop if the queue empties). Indices after a pre-current remove
 * shift down.
 */
export function removeQueueIndex(index: number): void {
  const { queue, queueIndex } = _state
  if (index < 0 || index >= queue.length) return
  const next = queue.filter((_, i) => i !== index)
  if (next.length === 0) {
    stop({ clearQueue: true })
    return
  }
  if (index === queueIndex) {
    const newIndex = Math.min(index, next.length - 1)
    patch({ queue: next, queueIndex: newIndex })
    playQueueItem(next[newIndex])
    return
  }
  const newIndex = index < queueIndex ? queueIndex - 1 : queueIndex
  patch({ queue: next, queueIndex: newIndex })
}

/** Reorder within the session queue; keeps the current track identity. */
export function moveQueueItem(from: number, to: number): void {
  const { queue, queueIndex } = _state
  if (
    from < 0 ||
    to < 0 ||
    from >= queue.length ||
    to >= queue.length ||
    from === to
  ) {
    return
  }
  const next = [...queue]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  let newIndex = queueIndex
  if (from === queueIndex) newIndex = to
  else if (from < queueIndex && to >= queueIndex) newIndex = queueIndex - 1
  else if (from > queueIndex && to <= queueIndex) newIndex = queueIndex + 1
  patch({ queue: next, queueIndex: newIndex })
}

/**
 * Insert immediately after the current item (Play Next).
 * Empty queue → becomes the session and starts playing.
 */
export function queuePlayNext(item: LyricMomentQueueItem): void {
  const { queue, queueIndex } = _state
  if (queue.length === 0) {
    patch({ queue: [item], queueIndex: 0 })
    playQueueItem(item)
    return
  }
  const next = [...queue]
  next.splice(queueIndex + 1, 0, item)
  patch({ queue: next })
}

/** Append to the end of Up Next. Empty queue → start playing. */
export function queueAdd(item: LyricMomentQueueItem): void {
  const { queue } = _state
  if (queue.length === 0) {
    patch({ queue: [item], queueIndex: 0 })
    playQueueItem(item)
    return
  }
  patch({ queue: [...queue, item] })
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
  playOrToggleSnippet,
  playFull,
  togglePlayPause,
  stop,
  seekSnippetProgress,
  playFullSeek,
  setQueue,
  queueNext,
  queuePrev,
  playQueueItem,
  playQueueIndex,
  removeQueueIndex,
  moveQueueItem,
  queuePlayNext,
  queueAdd,
  preloadSong,
  warmUrl,
  setVolume,
  toggleMute,
}