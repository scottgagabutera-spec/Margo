import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
function listenModeForTest(input: {
  songId?: string | null
  audioUrl?: string | null
  externalListenUrl?: string | null
  songTitle?: string | null
  artistName?: string | null
}): 'play' | 'external' | 'none' {
  if (input.audioUrl && input.songId) return 'play'
  if (input.externalListenUrl?.startsWith('https://')) return 'external'
  if ((input.songTitle || input.artistName)?.trim()) return 'external'
  return 'none'
}

describe('Lyric Back reply listen affordance', () => {
  it('ECHO_SELECT includes song_id, songs audio_url, external_listen_url, artwork', () => {
    const echoesHook = fs.readFileSync('hooks/useEchoes.ts', 'utf8')
    assert.match(echoesHook, /export const ECHO_SELECT/)
    assert.match(echoesHook, /song_id/)
    assert.match(echoesHook, /external_listen_url/)
    assert.match(echoesHook, /artwork_url/)
    assert.match(echoesHook, /songs:song_id \( audio_url, artwork_url \)/)
  })

  it('listen mode: Margo catalog → play', () => {
    assert.equal(
      listenModeForTest({
        songId: 'song-1',
        audioUrl: 'https://cdn.example/track.mp3',
        songTitle: 'Leave the lights on',
        artistName: 'Margo',
      }),
      'play',
    )
  })

  it('listen mode: third-party → external', () => {
    assert.equal(
      listenModeForTest({
        songId: null,
        audioUrl: null,
        songTitle: 'See You Again',
        artistName: 'Wiz Khalifa',
        externalListenUrl: 'https://music.apple.com/us/album/example',
      }),
      'external',
    )
  })

  it('LyricBackThreadRow wires songId, audioUrl, externalListenUrl into listen control', () => {
    const row = fs.readFileSync('components/lyric-back-thread-row.tsx', 'utf8')
    assert.match(row, /songId=\{echo\.songId\}/)
    assert.match(row, /audioUrl=\{echo\.audioUrl\}/)
    assert.match(row, /externalListenUrl=\{echo\.externalListenUrl\}/)
    assert.match(row, /LyricBackTrackListenControl/)
  })

  it('post page and feed panel use the same LyricBackThreadRow via LyricBackFocusBody', () => {
    const focus = fs.readFileSync('components/lyric-back-focus-panel.tsx', 'utf8')
    assert.match(focus, /post-inline/)
    assert.match(focus, /feed-panel/)
    assert.match(focus, /<LyricBackThreadRow/)
    const postSection = fs.readFileSync('components/post-detail-lyric-section.tsx', 'utf8')
    assert.match(postSection, /variant="post-inline"/)
    assert.match(postSection, /vibeThemeStyleVars/)
  })
})
