/**
 * Margo AudioEngine — shared types & constants
 * @see docs/TARGET_ARCHITECTURE_AUDIO_ENGAGEMENT.md Section 2
 *
 * Phase 1: playback state + play requests + queue items only.
 * Engagement timers (play qualification) live in engine internals until Phase 2.
 */

// ── Playback mode ─────────────────────────────────────────────────

/** idle = no active session; snippet = SRT window; full = karaoke / tier-1 */
export type PlaybackMode = 'idle' | 'snippet' | 'full'

// ── Snippet timing (Section 2.6) ──────────────────────────────────

/** Seconds after `endSec` before snippet auto-stops */
export const SNIPPET_END_PAD_SEC = 0.3

/** Hard cap on snippet auto-stop timer (music board auto-rotate safety) */
export const SNIPPET_MAX_DURATION_SEC = 30

// ── Sources (analytics / debugging — not user-facing) ─────────────

export type SnippetPlaybackSource = 'feed' | 'music-board' | 'mini-player' | 'music-resonance-row'

export type FullPlaybackSource = 'karaoke' | 'feed-tier1'

// ── Snippet window ────────────────────────────────────────────────

export interface SnippetBounds {
  startSec: number
  endSec: number
  lineIndex: number
  lineText: string
}

// ── Queue (session Up Next — snippets and/or full tracks) ─────────

/**
 * Session queue entry. Discriminated by `kind`:
 * - `snippet` (default / omitted): lyric window — plays [startSec, endSec], then
 *   advances to the next item. Never auto-expands into the full track.
 * - `full`: entire song — plays to natural end, then advances or stops (D4).
 *
 * Maps from Discover `LyricMoment` when kind is snippet:
 * lineId → lineIndex, line → lineText, start/end → startSec/endSec, vibes[0] → vibe.
 */
export interface LyricMomentQueueItem {
  /**
   * `snippet` = play window only then advance (default).
   * `full` = play whole file then advance / stop.
   */
  kind?: 'snippet' | 'full'
  songId: string
  audioUrl: string
  title: string
  artist: string
  artwork?: string | null
  lineIndex: number
  lineText: string
  startSec: number
  endSec: number
  vibe?: string | null
}

/** True when this queue item is a full-track entry (not a lyric window). */
export function isFullQueueItem(item: LyricMomentQueueItem): boolean {
  return item.kind === 'full'
}

/** Snippet window (default when kind omitted — Discover mixtapes). */
export function isSnippetQueueItem(item: LyricMomentQueueItem): boolean {
  return item.kind !== 'full'
}

/** Build a full-track queue row from catalog song fields. */
export function fullSongToQueueItem(song: {
  id: string
  audioUrl: string
  title: string
  artist: string
  artwork?: string | null
}): LyricMomentQueueItem {
  return {
    kind: 'full',
    songId: song.id,
    audioUrl: song.audioUrl,
    title: song.title,
    artist: song.artist,
    artwork: song.artwork ?? null,
    lineIndex: -1,
    lineText: '',
    startSec: 0,
    endSec: 0,
  }
}

/** Build a snippet-window queue row (Resonance / Lyric Moment). */
export function snippetToQueueItem(snippet: {
  songId: string
  audioUrl: string
  title: string
  artist: string
  artwork?: string | null
  lineIndex: number
  lineText: string
  startSec: number
  endSec: number
  vibe?: string | null
}): LyricMomentQueueItem {
  return {
    kind: 'snippet',
    songId: snippet.songId,
    audioUrl: snippet.audioUrl,
    title: snippet.title,
    artist: snippet.artist,
    artwork: snippet.artwork ?? null,
    lineIndex: snippet.lineIndex,
    lineText: snippet.lineText,
    startSec: snippet.startSec,
    endSec: snippet.endSec,
    vibe: snippet.vibe ?? null,
  }
}

/** Derived queue navigation flags for mini-player UI */
export interface QueueNavigationState {
  canPrev: boolean
  canNext: boolean
  queueIndex: number
  queueLength: number
}

// ── Play requests (Section 2.3) ─────────────────────────────────────

export interface PlaySnippetRequest {
  songId: string
  audioUrl: string
  title: string
  artist: string
  artwork?: string | null
  /** REQUIRED — resolved at call site from SRT; engine does not fuzzy-match post text */
  lineIndex: number
  lineText: string
  startSec: number
  endSec: number
  vibe?: string | null
  source: SnippetPlaybackSource
}

export interface PlayFullRequest {
  songId: string
  audioUrl: string
  title: string
  artist: string
  artwork?: string | null
  /** Seek target when entering full mode or jumping to a lyric line */
  startSec?: number
  /**
   * Default false — first play() requires user gesture or tap overlay (iOS).
   * When false, engine loads audio and sets buffering until playFull is called with autoplay or togglePlayPause.
   */
  autoplay?: boolean
  source: FullPlaybackSource
}

// ── Public engine state (Section 2.2) ─────────────────────────────

export interface AudioEngineState {
  mode: PlaybackMode
  playing: boolean
  buffering: boolean
  muted: boolean
  /** 0–1 */
  volume: number
  /** Element currentTime in seconds */
  currentTime: number
  /** Full file duration from loadedmetadata; 0 until known */
  duration: number
  /**
   * 0–100, mode-aware:
   * - snippet: position within [startSec, endSec]
   * - full: currentTime / duration
   * - idle: 0
   */
  progress: number
  songId: string | null
  audioUrl: string | null
  title: string
  artist: string
  artwork: string | null
  vibe: string | null
  snippet: SnippetBounds | null
  queue: LyricMomentQueueItem[]
  queueIndex: number
  error: string | null
  /**
   * Incremented on every exclusive playSnippet/playFull/stop.
   * Handlers compare against this to ignore stale timeupdate/ended events.
   */
  sessionGeneration: number
}

// ── stop() options ──────────────────────────────────────────────────

export interface StopOptions {
  /** When true, clears queue and resets queueIndex (default false) */
  clearQueue?: boolean
}

// ── Subscriptions ─────────────────────────────────────────────────

export type AudioEngineListener = (state: AudioEngineState) => void

// ── Initial state (engine singleton seed) ─────────────────────────

export const INITIAL_AUDIO_ENGINE_STATE: AudioEngineState = {
  mode: 'idle',
  playing: false,
  buffering: false,
  muted: false,
  volume: 1,
  currentTime: 0,
  duration: 0,
  progress: 0,
  songId: null,
  audioUrl: null,
  title: '',
  artist: '',
  artwork: null,
  vibe: null,
  snippet: null,
  queue: [],
  queueIndex: 0,
  error: null,
  sessionGeneration: 0,
}

// ── Pure helpers (safe for UI + engine) ───────────────────────────

/** Snippet auto-stop duration in ms — Section 2.6 cap */
export function getSnippetStopDurationMs(startSec: number, endSec: number): number {
  const spanSec = Math.max(0, endSec - startSec) + SNIPPET_END_PAD_SEC
  return Math.min(spanSec * 1000, SNIPPET_MAX_DURATION_SEC * 1000)
}

/** Mode-aware progress 0–100 */
export function computePlaybackProgress(
  mode: PlaybackMode,
  currentTime: number,
  duration: number,
  snippet: SnippetBounds | null,
): number {
  if (mode === 'snippet' && snippet) {
    const span = snippet.endSec - snippet.startSec
    if (span <= 0) return 0
    const t = Math.max(0, Math.min(currentTime - snippet.startSec, span))
    return (t / span) * 100
  }
  if (mode === 'full' && duration > 0) {
    return Math.max(0, Math.min(100, (currentTime / duration) * 100))
  }
  return 0
}

export function getQueueNavigationState(
  queue: LyricMomentQueueItem[],
  queueIndex: number,
): QueueNavigationState {
  return {
    canPrev: queueIndex > 0,
    canNext: queue.length > 0 && queueIndex < queue.length - 1,
    queueIndex,
    queueLength: queue.length,
  }
}

/**
 * Build a PlaySnippetRequest from a queue item (mini-player prev/next).
 * Only valid for snippet items — callers must branch on kind first.
 */
export function queueItemToSnippetRequest(
  item: LyricMomentQueueItem,
  source: SnippetPlaybackSource = 'mini-player',
): PlaySnippetRequest {
  return {
    songId: item.songId,
    audioUrl: item.audioUrl,
    title: item.title,
    artist: item.artist,
    artwork: item.artwork ?? null,
    lineIndex: item.lineIndex,
    lineText: item.lineText,
    startSec: item.startSec,
    endSec: item.endSec,
    vibe: item.vibe ?? null,
    source,
  }
}

/** Build a PlayFullRequest from a full-track queue item. */
export function queueItemToFullRequest(
  item: LyricMomentQueueItem,
  source: FullPlaybackSource = 'karaoke',
): PlayFullRequest {
  return {
    songId: item.songId,
    audioUrl: item.audioUrl,
    title: item.title,
    artist: item.artist,
    artwork: item.artwork ?? null,
    autoplay: true,
    source,
  }
}