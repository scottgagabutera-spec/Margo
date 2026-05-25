/**
 * Margo AudioEngine — URL preload cache
 * @see docs/TARGET_ARCHITECTURE_AUDIO_ENGAGEMENT.md Section 2.2
 *
 * Tracks known audioUrl per songId so the engine can skip
 * redundant src assignments. Does NOT create HTMLAudioElement
 * instances — the engine owns the single DOM <audio>.
 *
 * warmPreloadUrl() fires a lightweight link rel=prefetch hint
 * so the browser warms the CDN connection before play() is called.
 */

// ── Internal cache ────────────────────────────────────────────────
/** songId → audioUrl (metadata only — no Audio elements) */
const _urlCache = new Map<string, string>()

/** audioUrls already hinted to the browser */
const _warmed = new Set<string>()

// ── Public API ────────────────────────────────────────────────────

/**
 * Register a known audioUrl for a songId.
 * Called by engine.playSnippet / engine.playFull before prepareSource.
 * Safe to call repeatedly with the same args.
 */
export function registerPreloadSong(songId: string, audioUrl: string): void {
  if (!songId || !audioUrl) return
  _urlCache.set(songId, audioUrl)
}

/**
 * Retrieve the cached audioUrl for a songId, if known.
 * Returns undefined when not yet registered.
 */
export function getCachedAudioUrl(songId: string): string | undefined {
  return _urlCache.get(songId)
}

/**
 * Fire a browser prefetch hint for an audioUrl.
 * Uses <link rel="prefetch"> in supported environments —
 * warms the CDN connection so the engine's src assignment
 * reaches canplaythrough faster on first tap.
 *
 * No-op in SSR or when already warmed.
 */
export function warmPreloadUrl(audioUrl: string): void {
  if (typeof document === 'undefined') return
  if (!audioUrl) return
  if (_warmed.has(audioUrl)) return
  _warmed.add(audioUrl)

  try {
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.as = 'audio'
    link.href = audioUrl
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)
  } catch {
    /* ignore — prefetch is a best-effort optimisation */
  }
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
 * Clear the cache — used in tests or hard reset.
 * Not called in production flow.
 */
export function clearPreloadCache(): void {
  _urlCache.clear()
  _warmed.clear()
}
