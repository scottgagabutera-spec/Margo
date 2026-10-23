import { normalizeEmotionKey } from './moment/vibe.ts'

export const LB_MAX_TEXT = 500
export const LB_MAX_SONG = 300
export const LB_MAX_ARTIST = 300

const ALLOWED_EMOTION_KEYS = new Set([
  'chill',
  'hope',
  'healing',
  'grateful',
  'spiritual',
  'nostalgia',
  'joy',
  'love',
  'hype',
  'proud',
  'heartbreak',
  'pain',
  'loneliness',
  'lost',
  'rage',
  'sendit',
  'letout',
])

export type LyricBackWriteBody = {
  text: string
  songTitle: string
  artistName: string
  emotion: string
  songId: string | null
  artworkUrl: string | null
  snippetStartSec: number | null
  snippetEndSec: number | null
  externalListenUrl: string | null
}

export function trimExternalUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const s = raw.trim()
  if (!s.startsWith('http://') && !s.startsWith('https://')) return null
  return s
}

export function parseLyricBackWriteBody(raw: unknown):
  | { ok: true; body: LyricBackWriteBody }
  | { ok: false; error: string; status: number } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Invalid request body', status: 400 }
  }
  const b = raw as Record<string, unknown>
  const text = typeof b.text === 'string' ? b.text.trim() : ''
  const songTitle = typeof b.songTitle === 'string' ? b.songTitle.trim() : ''
  const artistName = typeof b.artistName === 'string' ? b.artistName.trim() : ''
  const emotionRaw = typeof b.emotion === 'string' ? b.emotion.trim() : ''

  if (!text || !songTitle || !artistName || !emotionRaw) {
    return { ok: false, error: 'Lyric, song, artist, and vibe are required.', status: 400 }
  }
  if (text.length > LB_MAX_TEXT || songTitle.length > LB_MAX_SONG || artistName.length > LB_MAX_ARTIST) {
    return { ok: false, error: 'One of the fields is too long.', status: 400 }
  }

  const emotionKey = normalizeEmotionKey(emotionRaw)
  if (!ALLOWED_EMOTION_KEYS.has(emotionKey)) {
    return { ok: false, error: 'Choose a valid vibe.', status: 400 }
  }

  const songId =
    typeof b.songId === 'string' && b.songId.trim() ? b.songId.trim() : null
  const artworkUrl =
    typeof b.artworkUrl === 'string' && b.artworkUrl.trim() ? b.artworkUrl.trim() : null
  const externalListenUrl = trimExternalUrl(b.externalListenUrl)

  const snippetStartSec =
    typeof b.snippetStartSec === 'number' && Number.isFinite(b.snippetStartSec)
      ? b.snippetStartSec
      : null
  const snippetEndSec =
    typeof b.snippetEndSec === 'number' && Number.isFinite(b.snippetEndSec)
      ? b.snippetEndSec
      : null

  return {
    ok: true,
    body: {
      text,
      songTitle,
      artistName,
      emotion: emotionKey,
      songId,
      artworkUrl,
      snippetStartSec,
      snippetEndSec,
      externalListenUrl,
    },
  }
}
