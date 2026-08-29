/**
 * Hard-coded single-line Moment for the video export spike only.
 * Not used by production export paths.
 */

export const SPIKE_VIDEO_WIDTH = 1080
export const SPIKE_VIDEO_HEIGHT = 1920
export const SPIKE_FPS = 30

/** Total export duration — matches snippet length for this spike. */
export const SPIKE_DURATION_SEC = 10

export interface SpikeMoment {
  lyric: string
  songTitle: string
  artistName: string
  vibeLabel: string
  themeId: 'dusk'
  /** Production R2 URL — use spikeAudioFetchUrl() in browser for CORS-safe fetch */
  audioUrl: string
  snippetStart: number
  snippetEnd: number
  artworkUrl: string | null
}

export const SPIKE_MOMENT: SpikeMoment = {
  lyric: 'I still hear your voice in the quiet',
  songTitle: 'Formidable',
  artistName: 'Margo',
  vibeLabel: 'Heartbreak',
  themeId: 'dusk',
  audioUrl: 'https://audio.trymargo.com/Margo/audio/Formidable.mp3',
  snippetStart: 62,
  snippetEnd: 72,
  artworkUrl: null,
}

/** Same-origin proxy for localhost dev (R2 CORS allows trymargo.com only). */
export function spikeAudioFetchUrl(moment: SpikeMoment = SPIKE_MOMENT): string {
  if (typeof window === 'undefined') return moment.audioUrl
  const host = window.location.hostname
  if (host === 'trymargo.com' || host === 'www.trymargo.com') {
    return moment.audioUrl
  }
  return '/api/dev/moment-spike-audio'
}

export function spikeWords(lyric: string): string[] {
  return lyric.trim().split(/\s+/).filter(Boolean)
}
