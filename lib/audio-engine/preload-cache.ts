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
 * No-op in SSR or if already in pool.
 */
export function warmPreloadUrl(audioUrl: string): void {
  if (typeof document === 'undefined') return
  if (!audioUrl) return
  if (findSlot(audioUrl)) return   // already warming or warmed

  let slot: PoolSlot

  if (_pool.length < POOL_SIZE) {
    // Pool has room — add a new slot
    const audio = createPoolAudio()
    slot = { audio, url: audioUrl, lastUsed: Date.now() }
    _pool.push(slot)
  } else {
    // Evict LRU slot and reuse its audio element
    slot = evictLRU()
    slot.audio.pause()
    slot.audio.removeAttribute('src')
    slot.audio.load()
    slot.url = audioUrl
    slot.lastUsed = Date.now()
  }

  slot.audio.src = audioUrl
  slot.audio.load()
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
 * Engine uses this to copy buffered data to the main audio element
 * via src transfer — avoids re-fetching already-buffered data.
 */
export function getPoolAudio(audioUrl: string): HTMLAudioElement | null {
  const slot = findSlot(audioUrl)
  if (!slot) return null
  slot.lastUsed = Date.now()
  return slot.audio
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
  }
}
