/**
 * Poster/thumbnail timing check — run: npx tsx scripts/verify-export-poster-timing.mjs
 */
import { buildMomentTimeline } from '../lib/moment-export/timeline/build-moment-timeline.ts'
import {
  completedCardRenderTimeSec,
  resolveExportRenderTimeSec,
} from '../lib/moment-export/video/export-frame-timing.ts'

function makeMoment(lyric, snippetSec) {
  return {
    lines: [{
      lyric,
      songTitle: 'Test Song',
      artistName: 'Test Artist',
      artworkUrl: 'https://audio.trymargo.com/Margo/artwork/example.jpg',
      audioUrl: 'https://audio.trymargo.com/Margo/audio/example.mp3',
      snippetStart: 0,
      snippetEnd: snippetSec,
    }],
    themeId: 'gold',
    shapeId: 'square',
    vibeLabel: 'Tender',
    seedKey: 'poster-timing-test',
  }
}

function assertCompleteAtPoster(moment, snippetSec, fps) {
  const timeline = buildMomentTimeline(moment, snippetSec)
  const posterSec = completedCardRenderTimeSec(timeline)
  const introFrameTime = resolveExportRenderTimeSec(0, fps, posterSec)

  const metaEnd = timeline.metaRevealStartSec + timeline.metaRevealDurationSec
  const vibeEnd = timeline.vibeRevealStartSec + timeline.vibeRevealDurationSec
  const lastWordEnd = timeline.words.reduce((m, w) => Math.max(m, w.revealEndSec), 0)

  if (introFrameTime < metaEnd - 0.001) {
    throw new Error(`meta incomplete at poster time (${introFrameTime} < ${metaEnd})`)
  }
  if (introFrameTime < vibeEnd - 0.001) {
    throw new Error(`vibe incomplete at poster time (${introFrameTime} < ${vibeEnd})`)
  }
  if (introFrameTime < lastWordEnd - 0.001) {
    throw new Error(`lyric incomplete at poster time (${introFrameTime} < ${lastWordEnd})`)
  }
}

const cases = [
  { label: 'short lyric / 5s clip', lyric: 'Para sa mga batang hindi', snippetSec: 5 },
  { label: 'long lyric / 7s clip', lyric: 'But we were strangers, you shut down when it got hard', snippetSec: 7 },
  { label: 'short lyric / 2s clip', lyric: 'Hello world', snippetSec: 2 },
]

for (const c of cases) {
  const moment = makeMoment(c.lyric, c.snippetSec)
  assertCompleteAtPoster(moment, c.snippetSec, 12)
  assertCompleteAtPoster(moment, c.snippetSec, 30)
  console.log('OK', c.label)
}

console.log('\nAll poster timing checks passed')
