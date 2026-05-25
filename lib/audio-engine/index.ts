/**
 * Margo AudioEngine — barrel export
 * @see docs/TARGET_ARCHITECTURE_AUDIO_ENGAGEMENT.md Section 2.1
 *
 * Import from '@/lib/audio-engine' in all consumers.
 * Do not import individual modules directly outside lib/audio-engine/.
 */

// Types & constants
export type {
  PlaybackMode,
  SnippetBounds,
  LyricMomentQueueItem,
  QueueNavigationState,
  PlaySnippetRequest,
  PlayFullRequest,
  AudioEngineState,
  AudioEngineListener,
  StopOptions,
  SnippetPlaybackSource,
  FullPlaybackSource,
} from './types'

export {
  SNIPPET_END_PAD_SEC,
  SNIPPET_MAX_DURATION_SEC,
  INITIAL_AUDIO_ENGINE_STATE,
  computePlaybackProgress,
  getSnippetStopDurationMs,
  getQueueNavigationState,
  queueItemToSnippetRequest,
} from './types'

// Engine public API
export {
  subscribeAudioEngine,
  getAudioEngineState,
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
  audioEngine,
} from './engine'

// Preload cache
export {
  registerPreloadSong,
  getCachedAudioUrl,
  warmPreloadUrl,
  warmSong,
} from './preload-cache'

// Snippet resolver
export type { SrtLine, ResolvedSnippet } from './snippet-resolver'
export {
  resolveSnippetFromLines,
  findLineIndexForText,
  resolveCurrentLineIndex,
} from './snippet-resolver'
