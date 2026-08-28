/**
 * Quick caption logic check — run: npx tsx scripts/verify-file-share-captions.mjs
 */
import { buildMomentFileShareCaption } from '../lib/moment/file-share.ts'

const baseLine = {
  lyric: "I sent you these words because they say something I can't.",
  songTitle: 'Formidable',
  artistName: 'Stromae',
  artworkUrl: null,
  position: 0,
}

const margoPublished = {
  lines: [{ ...baseLine, songId: 'song-1', audioUrl: 'https://audio.trymargo.com/x.mp3', snippetStart: 0, snippetEnd: 10 }],
  themeId: 'gold',
  shapeId: 'square',
  seedKey: 'a',
  postId: 'post-uuid',
  status: 'active',
}

const margoStage = {
  lines: [{ ...baseLine, songId: 'song-1', audioUrl: 'https://audio.trymargo.com/x.mp3', snippetStart: 0, snippetEnd: 10 }],
  themeId: 'gold',
  shapeId: 'square',
  seedKey: 'b',
}

const external = {
  lines: [{ ...baseLine, source: 'apple' }],
  themeId: 'gold',
  shapeId: 'square',
  seedKey: 'c',
  listen: {
    mode: 'external',
    canPlayInline: false,
    externalUrl: 'https://music.apple.com/us/album/example',
  },
}

for (const [label, moment] of [['published', margoPublished], ['stage-catalog', margoStage], ['external', external]]) {
  const cap = buildMomentFileShareCaption(moment)
  console.log('\n===', label, '===')
  console.log(cap.text)
}
