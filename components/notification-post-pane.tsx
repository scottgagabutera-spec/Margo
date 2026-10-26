'use client'

import Link from 'next/link'
import { usePost } from '@/hooks/usePost'
import { LYRIC_FONT, LIST_ROW_TYPE, UI_FONT } from '@/lib/fonts'
import { PlayPauseIcon } from '@/components/play-pause-icon'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import { playSnippet } from '@/lib/audio-engine'

export function NotificationPostPane({ postId }: { postId: string | null }) {
  const { post, loading } = usePost(postId)
  const engine = useAudioEngine()

  if (!postId) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}>
        <p style={{ fontFamily: UI_FONT, fontSize: LIST_ROW_TYPE.preview, color: 'var(--text-muted)', margin: 0 }}>
          Select a notification
        </p>
      </div>
    )
  }

  if (loading || !post) {
    return (
      <p style={{ fontFamily: UI_FONT, color: 'var(--text-muted)', padding: '24px' }}>Loading…</p>
    )
  }

  const lyric = post.text?.trim() || post.lines?.[0]?.text || ''
  const playing = engine.mode !== 'idle'

  return (
    <div style={{ padding: '20px 24px var(--margo-page-padding-bottom)', maxWidth: '560px' }}>
      <p style={{ fontFamily: UI_FONT, fontSize: LIST_ROW_TYPE.name, fontWeight: 600, margin: '0 0 4px' }}>
        {post.authorDisplayName || post.username}
      </p>
      <p style={{ fontFamily: UI_FONT, fontSize: LIST_ROW_TYPE.preview, color: 'var(--text-muted)', margin: '0 0 20px' }}>
        @{post.username}
      </p>
      <p style={{
        fontFamily: LYRIC_FONT,
        fontStyle: 'italic',
        fontSize: '1.35rem',
        lineHeight: 1.45,
        color: 'var(--text)',
        margin: '0 0 24px',
      }}>
        {lyric}
      </p>
      {post.knowledge?.song ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          background: 'var(--surface-2)',
          marginBottom: '16px',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: UI_FONT, fontSize: LIST_ROW_TYPE.name, margin: 0, color: 'var(--text)' }}>
              {post.knowledge.song}
            </p>
            <p style={{ fontFamily: UI_FONT, fontSize: LIST_ROW_TYPE.preview, margin: '4px 0 0', color: 'var(--text-muted)' }}>
              {post.knowledge.artist}
            </p>
          </div>
          <button
            type="button"
            aria-label={playing ? 'Pause' : 'Play'}
            onClick={() => {
              if (post.audioUrl) {
                if (post.audioUrl) {
                  void playSnippet({
                    audioUrl: post.audioUrl,
                    songId: post.songId || post.id,
                    title: post.knowledge?.song || 'Song',
                    artist: post.knowledge?.artist || '',
                    lineIndex: 0,
                    lineText: lyric,
                    startSec: post.snippetStart ?? 0,
                    endSec: post.snippetEnd ?? post.snippetStart ?? 0,
                    source: 'mini-player',
                  })
                }
              }
            }}
            style={{
              width: 'var(--margo-touch-min)',
              height: 'var(--margo-touch-min)',
              borderRadius: '12px',
              border: 'none',
              background: 'var(--gold)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PlayPauseIcon playing={playing} size={18} color="var(--bg)" />
          </button>
        </div>
      ) : null}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <Link href={`/post/${post.id}`} style={{ fontFamily: UI_FONT, fontSize: LIST_ROW_TYPE.chip, color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>
          Open full post
        </Link>
      </div>
    </div>
  )
}
