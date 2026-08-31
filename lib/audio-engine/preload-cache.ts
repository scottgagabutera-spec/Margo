/**
 * Margo AudioEngine — Real audio preload pool
 * @see docs/TARGET_ARCHITECTURE_AUDIO_ENGAGEMENT.md Section 2.2
 *
 * Maintains a pool of hidden <audio> elements that actively buffer
 * audio data in the background. When the engine needs to play a URL
 * that is already buffered, prepareSource() can skip the load wait
 * entirely — instant play.
 *
 * Pool size: 3 slots (LRU eviction). Covers feed scroll-ahead,
 * karaoke warm path, and music board hover preload.
 */

// ── Types ─────────────────────────────────────────────────────────

interface PoolSlot {
  audio: HTMLAudioElement
  url: string
  lastUsed: number
  startSec: number
}

// ── Module state ──────────────────────────────────────────────────

const POOL_SIZE = 6
const _pool: PoolSlot[] = []

/** songId → audioUrl (metadata only) */
const _urlCache = new Map<string, string>()

// ── Pool helpers ──────────────────────────────────────────────────

function createPoolAudio(): HTMLAudioElement {
  const el = document.createElement('audio')
  el.preload = 'auto'
  el.setAttribute('playsinline', '')
  el.muted = true       // must be muted to preload without user gesture
  el.volume = 0
  el.style.display = 'none'
  document.body.appendChild(el)
  return el
}

function findSlot(url: string): PoolSlot | undefined {
  return _pool.find(s => s.url === url)
}

/** True when `t` is inside a buffered range (enough to start without a stall). */
export function isTimeBuffered(audio: HTMLAudioElement, t: number): boolean {
  if (!Number.isFinite(t) || t < 0) return audio.readyState >= 2
  try {
    const { buffered } = audio
    for (let i = 0; i < buffered.length; i++) {
      if (buffered.start(i) <= t && buffered.end(i) >= t + 0.4) return true
    }
  } catch {
    /* TimeRanges can throw while the element is mid-load */
  }
  return t <= 0.15 && audio.readyState >= 2
}

function seekPoolTo(slot: PoolSlot, startSec: number): void {
  const t = Number.isFinite(startSec) && startSec > 0.15 ? startSec : 0
  slot.startSec = t
  if (t <= 0) return
  const audio = slot.audio
  const apply = () => {
    try {
      if (Math.abs(audio.currentTime - t) > 0.2) audio.currentTime = t
    } catch {
      /* metadata not ready */
    }
  }
  if (audio.readyState >= 1) apply()
  else audio.addEventListener('loadedmetadata', apply, { once: true })
}

function evictLRU(): PoolSlot {
  // Sort ascending by lastUsed — evict oldest
  _pool.sort((a, b) => a.lastUsed - b.lastUsed)
  return _pool[0]
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Register a known audioUrl for a songId.
 * Safe to call repeatedly.
 */
export function registerPreloadSong(songId: string, audioUrl: string): void {
  if (!songId || !audioUrl) return
  _urlCache.set(songId, audioUrl)
}

/**
 * Retrieve the cached audioUrl for a songId.
 */
export function getCachedAudioUrl(songId: string): string | undefined {
  return _urlCache.get(songId)
}

/**
 * Actively buffer an audio URL in the preload pool.
 * Creates or reuses a hidden <audio> element and sets src + load().
 * Pass startSec so the browser Range-requests the snippet window instead of
 * only buffering from byte 0 of a multi-minute MP3.
 */
export function warmPreloadUrl(audioUrl: string, startSec = 0): void {
  if (typeof document === 'undefined') return
  if (!audioUrl) return

  const existing = findSlot(audioUrl)
  if (existing) {
    existing.lastUsed = Date.now()
    seekPoolTo(existing, startSec)
    return
  }

  let slot: PoolSlot

  if (_pool.length < POOL_SIZE) {
    const audio = createPoolAudio()
    slot = { audio, url: audioUrl, lastUsed: Date.now(), startSec: 0 }
    _pool.push(slot)
  } else {
    slot = evictLRU()
    slot.audio.pause()
    slot.audio.removeAttribute('src')
    slot.audio.load()
    slot.url = audioUrl
    slot.lastUsed = Date.now()
    slot.startSec = 0
  }

  slot.audio.src = audioUrl
  slot.audio.load()
  seekPoolTo(slot, startSec)
}

/**
 * Warm the audioUrl for a known songId (convenience wrapper).
 * Called by AudioEngineProvider on ?au= query param (karaoke warm path).
 */
export function warmSong(songId: string): void {
  const url = getCachedAudioUrl(songId)
  if (url) warmPreloadUrl(url)
}

/**
 * Warm a prioritized list of URLs while respecting the pool size.
 * Deduplicates the input list and warms up to at most POOL_SIZE slots
 * (does not evict existing warmed slots).
 */
export function warmUrls(urls: string[]): void {
  if (typeof document === 'undefined') return
  if (!Array.isArray(urls) || urls.length === 0) return

  const deduped: string[] = []
  const seen = new Set<string>()
  for (const u of urls) {
    if (!u) continue
    if (seen.has(u)) continue
    seen.add(u)
    deduped.push(u)
  }

  // Count currently occupied pool slots with a URL
  let occupied = _pool.filter(s => !!s.url).length

  for (const u of deduped) {
    if (findSlot(u)) continue // already warmed
    if (occupied >= POOL_SIZE) break // respect pool capacity — do not evict
    warmPreloadUrl(u)
    occupied++
  }
}

/**
 * Check if a URL is buffered enough to play instantly.
 * Returns the pool slot's readyState — caller uses >= 2 (HAVE_CURRENT_DATA).
 */
export function getPreloadReadyState(audioUrl: string): number {
  const slot = findSlot(audioUrl)
  return slot ? slot.audio.readyState : 0
}

/**
 * Get the buffered pool audio element for a URL, if available.
 * Engine uses this to promote a warmed element into the active A/B slot.
 */
export function getPoolAudio(audioUrl: string): HTMLAudioElement | null {
  const slot = findSlot(audioUrl)
  if (!slot) return null
  slot.lastUsed = Date.now()
  return slot.audio
}

/**
 * Hand the pool element for this URL to the main engine — even if it is
 * still buffering. Reusing the in-flight download avoids a second GET of
 * the same MP3 (the old readyState>=2 gate started a competing load).
 */
export function takeBufferedPoolElement(audioUrl: string): HTMLAudioElement | null {
  const slot = findSlot(audioUrl)
  if (!slot) return null
  const el = slot.audio
  slot.audio = createPoolAudio()
  slot.url = ''
  slot.lastUsed = 0
  slot.startSec = 0
  el.muted = false
  el.style.display = 'none'
  return el
}

/**
 * Recycle a detached main-engine <audio> element back into the LRU pool.
 */
export function recycleElementToPool(el: HTMLAudioElement): void {
  if (typeof document === 'undefined') return
  el.pause()
  el.removeAttribute('src')
  el.load()
  el.muted = true
  el.volume = 0
  el.style.display = 'none'

  const emptySlot = _pool.find(s => !s.url)
  if (emptySlot) {
    emptySlot.audio.remove()
    emptySlot.audio = el
    emptySlot.url = ''
    emptySlot.lastUsed = 0
    emptySlot.startSec = 0
    return
  }

  if (_pool.length < POOL_SIZE) {
    _pool.push({ audio: el, url: '', lastUsed: 0, startSec: 0 })
    return
  }

  const slot = evictLRU()
  slot.audio.remove()
  slot.audio = el
  slot.url = ''
  slot.lastUsed = 0
  slot.startSec = 0
}

/**
 * Remove a URL from the pool (e.g. after src transfer to main audio).
 * Frees the slot for the next warmPreloadUrl call.
 */
export function releaseFromPool(audioUrl: string): void {
  const idx = _pool.findIndex(s => s.url === audioUrl)
  if (idx === -1) return
  const slot = _pool[idx]
  slot.audio.pause()
  slot.audio.removeAttribute('src')
  slot.url = ''
  slot.lastUsed = 0
  slot.startSec = 0
  // Keep the audio element in the pool for reuse — don't remove from DOM
}

/**
 * Clear the cache — used in tests or hard reset.
 */
export function clearPreloadCache(): void {
  _urlCache.clear()
  for (const slot of _pool) {
    slot.audio.pause()
    slot.audio.removeAttribute('src')
    slot.url = ''
    slot.lastUsed = 0
    slot.startSec = 0
  }
}
