import type { LyricMoment } from '@/lib/lyric-moments-board'

/** Stable sample audio for Playwright (public MDN CC0 clip). */
const SAMPLE_AUDIO =
  'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3'

const SAMPLE_ART =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Iconic_image_of_a_record_album.jpg/240px-Iconic_image_of_a_record_album.jpg'

function clip(n: number, songId: string, artist: string, title: string, line: string): LyricMoment {
  return {
    line,
    start: 0,
    end: 8,
    lineId: n,
    songId,
    songTitle: title,
    artist,
    artwork: SAMPLE_ART,
    audioUrl: SAMPLE_AUDIO,
    vibes: ['reflective'],
  }
}

/** Six eligible songs — enough for Shorts minimum + peek / two-column tests. */
export const E2E_SHORTS_FIXTURE_CLIPS: LyricMoment[] = [
  clip(1, 'e2e-song-a', 'Artist One', 'Midnight Echo', 'We were golden in the quiet hours'),
  clip(2, 'e2e-song-b', 'Artist Two', 'Neon River', 'Hold the line till morning breaks'),
  clip(3, 'e2e-song-c', 'Artist Three', 'Paper Satellites', 'Write my name in borrowed light'),
  clip(4, 'e2e-song-d', 'Artist Four', 'Velvet Static', 'Sing it soft so the city listens'),
  clip(5, 'e2e-song-e', 'Artist Five', 'Harbor Lights', 'Every wave remembers your voice'),
  clip(6, 'e2e-song-f', 'Artist Six', 'Silver Tongue', 'Meet me where the chorus lands'),
]

export function isE2eShortsFixtureHostname(hostname: string): boolean {
  const host = hostname.replace(/^www\./, '').toLowerCase()
  return host !== 'trymargo.com'
}

export function shouldUseE2eShortsFixture(search: URLSearchParams, hostname: string): boolean {
  return search.get('e2eShorts') === '1' && isE2eShortsFixtureHostname(hostname)
}
