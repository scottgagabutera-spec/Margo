// ── Margo Global Player Store ─────────────────────────────────────
// Single source of truth for all audio playback across feed, music
// board, and the mini player. Module-level singleton — persists across
// page navigations within the same session.

export interface PlayerTrack {
  audioUrl: string
  songId: string | null
  songTitle: string
  artist: string
  artwork?: string | null
  currentLine?: string | null   // lyric line currently playing
  startTime?: number            // snippet start in seconds
  endTime?: number              // snippet end in seconds
  isSnippet: boolean            // true = snippet, false = full song
  vibe?: string | null          // emotion tag for color theming
  audioElement?: HTMLAudioElement | null  // pass existing audio — avoids double instance
}

type PlayerListener = (state: PlayerState) => void

export interface PlayerState {
  track: PlayerTrack | null
  playing: boolean
  muted: boolean
  volume: number                // 0–1
  progress: number              // 0–100
  currentTime: number
  duration: number
}


// ── Lyric queue — for mini player next/prev navigation ───────────
export interface LyricMoment {
  audioUrl: string
  songId: string | null
  songTitle: string
  artist: string
  artwork?: string | null
  currentLine: string | null
  startTime?: number
  endTime?: number
  vibe?: string | null
  isSnippet: boolean
  audioElement?: HTMLAudioElement | null
}

let _lyricQueue: LyricMoment[] = []
let _queueIndex = 0
export let _onNavigate: ((moment: LyricMoment) => void) | null = null

export function registerLyricQueue(queue: LyricMoment[], index: number, onNavigate: (moment: LyricMoment) => void) {
  _lyricQueue = queue
  _queueIndex = index
  _onNavigate = onNavigate
}

export function setLyricQueue(moments: any[]) {
  _lyricQueue = moments.map(m => ({
    audioUrl: m.audioUrl,
    songId: m.songId,
    songTitle: m.songTitle,
    artist: m.artist,
    artwork: m.artwork || null,
    currentLine: (m as any).currentLine || (m as any).line || null,
    startTime: (m as any).startTime ?? (m as any).start,
    endTime: (m as any).endTime ?? (m as any).end,
    vibe: (m as any).vibe || ((m as any).vibes && (m as any).vibes[0]) || null,
    isSnippet: true,
  }))
  _queueIndex = 0
}

export function pushToLyricQueue(moment: LyricMoment) {
  const exists = _lyricQueue.findIndex(m => m.currentLine === moment.currentLine && m.songId === moment.songId)
  if (exists === -1) {
    _lyricQueue.push(moment)
    _queueIndex = _lyricQueue.length - 1
  } else {
    _queueIndex = exists
  }
}

export function navigatePrev(): LyricMoment | null {
  if (_queueIndex > 0) { _queueIndex--; return _lyricQueue[_queueIndex] }
  return null
}

export function navigateNext(): LyricMoment | null {
  if (_queueIndex < _lyricQueue.length - 1) { _queueIndex++; return _lyricQueue[_queueIndex] }
  return null
}

export function getQueueState() {
  return { canPrev: _queueIndex > 0, canNext: _queueIndex < _lyricQueue.length - 1 }
}

// ── Internal state ────────────────────────────────────────────────
let _state: PlayerState = {
  track: null,
  playing: false,
  muted: false,
  volume: 1,
  progress: 0,
  currentTime: 0,
  duration: 0,
}

let _audio: HTMLAudioElement | null = null
let _stopTimer: ReturnType<typeof setTimeout> | null = null
let _listeners: Set<PlayerListener> = new Set()
let _wakeLock: any = null

// One-at-a-time enforcement
let _globalStop: (() => void) | null = null
export function registerGlobalAudio(stop: () => void) {
  if (_globalStop) _globalStop()
  // Also stop any mini player audio that was created by togglePlayer/next/prev
  if (_audio && !_audio.paused) {
    _audio.pause()
    _state = { ..._state, playing: false }
    notify()
  }
  _globalStop = stop
}
export function clearGlobalAudio() {
  _globalStop = null
}

// ── Notify all listeners ──────────────────────────────────────────
function notify() {
  _listeners.forEach(fn => fn({ ..._state }))
}

// ── Subscribe / unsubscribe ───────────────────────────────────────
export function subscribePlayer(fn: PlayerListener): () => void {
  _listeners.add(fn)
  fn({ ..._state }) // immediate snapshot
  return () => _listeners.delete(fn)
}

export function getPlayerState(): PlayerState {
  return { ..._state }
}

// ── Wake lock ─────────────────────────────────────────────────────
async function requestWakeLock() {
  if (typeof navigator === 'undefined') return
  try {
    if ('wakeLock' in navigator) {
      _wakeLock = await (navigator as any).wakeLock.request('screen')
    }
  } catch {}
}

function releaseWakeLock() {
  if (_wakeLock) {
    _wakeLock.release().catch(() => {})
    _wakeLock = null
  }
}

// ── Stop current audio ────────────────────────────────────────────
// ── Pause without clearing track ────────────────────────────────
export function pausePlayer() {
  if (_audio && !_audio.paused) { _audio.pause() }
  if (_stopTimer) { clearTimeout(_stopTimer); _stopTimer = null }
  _state = { ..._state, playing: false }
  releaseWakeLock()
  notify()
}

export function stopPlayer() {
  if (_stopTimer) { clearTimeout(_stopTimer); _stopTimer = null }
  if (_audio) {
    _audio.pause()
    _audio.ontimeupdate = null
    _audio.onended = null
    _audio.onloadedmetadata = null
  }
  _state = { ..._state, playing: false, progress: 0, currentTime: 0 }
  releaseWakeLock()
  notify()
}

// ── Play a track ──────────────────────────────────────────────────
export function playTrack(track: PlayerTrack) {
  // Stop current audio cleanly
  if (_audio && !_audio.paused) {
    _audio.pause()
    _audio.ontimeupdate = null
    _audio.onended = null
    _audio.onloadedmetadata = null
  }
  if (_stopTimer) { clearTimeout(_stopTimer); _stopTimer = null }

  // Use passed audio element or create new one
  const audio = track.audioElement || new Audio(track.audioUrl)
  _audio = audio
  audio.volume = _state.muted ? 0 : _state.volume
  if (!track.audioElement) { audio.preload = 'auto' }

  _state = { ..._state, track, playing: true, progress: 0, currentTime: 0, duration: 0 }
  notify()

  audio.onloadedmetadata = () => { _state = { ..._state, duration: audio.duration || 0 }; notify() }
  audio.ontimeupdate = () => {
    const dur = audio.duration || 1
    _state = { ..._state, currentTime: audio.currentTime, progress: (audio.currentTime / dur) * 100 }
    notify()
  }
  audio.onended = () => {
    _state = { ..._state, playing: false, progress: 0, currentTime: 0 }
    _globalStop = null
    releaseWakeLock()
    notify()
  }

  const doPlay = () => {
    if (track.startTime !== undefined && !track.audioElement) audio.currentTime = track.startTime
    if (!track.audioElement) { audio.play().catch(() => {}) }
    _state = { ..._state, playing: true }
    requestWakeLock()
    notify()
    if (track.isSnippet && track.startTime !== undefined && track.endTime !== undefined) {
      const dur = Math.min((track.endTime - track.startTime) * 1000 + 300, 8000)
      _stopTimer = setTimeout(() => {
        audio.pause()
        _state = { ..._state, playing: false }
        releaseWakeLock()
        notify()
      }, dur)
    }
  }

  if (track.audioElement) {
    doPlay()
  } else if (audio.readyState >= 3) {
    doPlay()
  } else {
    audio.load()
    audio.addEventListener('canplay', doPlay, { once: true })
  }
}

// ── Toggle play/pause ─────────────────────────────────────────────
export function togglePlayer() {
  if (!_state.track || !_audio) return
  if (_state.playing) {
    _audio.pause()
    _state = { ..._state, playing: false }
    releaseWakeLock()
    notify()
    return
  }
  // Replay from startTime if ended
  if (_audio.ended) {
    const t = _state.track
    if (t.startTime !== undefined) _audio.currentTime = t.startTime
    else _audio.currentTime = 0
  }
  const audio = _audio
  _globalStop?.()
  _globalStop = () => { audio.pause(); _state = { ..._state, playing: false }; notify() }
  _audio.play().catch(() => {})
  _state = { ..._state, playing: true }
  requestWakeLock()
  notify()
}

// ── Seek ──────────────────────────────────────────────────────────
export function seekPlayer(pct: number) {
  if (!_audio || !_state.duration) return
  const time = (pct / 100) * _state.duration
  _audio.currentTime = time
  _state = { ..._state, currentTime: time, progress: pct }
  notify()
}

// ── Volume / mute ─────────────────────────────────────────────────
export function setPlayerVolume(vol: number) {
  _state = { ..._state, volume: vol, muted: vol === 0 }
  if (_audio) _audio.volume = vol
  notify()
}

export function toggleMute() {
  const muted = !_state.muted
  _state = { ..._state, muted }
  if (_audio) _audio.volume = muted ? 0 : _state.volume
  notify()
}
