'use client'

import { useEffect, useRef, useState } from 'react'
import {
  LyricBackPanelCompose,
  type LyricBackPanelComposeHandle,
  type LyricBackPanelPrefill,
} from '@/components/lyric-back-panel-compose'
import { MomentComposeVibePicker } from '@/components/moment-compose-vibe-picker'
import type { Post } from '@/hooks/usePosts'
import { resolveMomentLines, type PostLine } from '@/lib/post-lines'
import { emotionToVibeLabel, vibeLabelToEmotion } from '@/lib/moment/vibe'

export type PostMomentInlineEditProps = {
  post: Post
  onCancel: () => void
  onSaved: (next: Post) => void
  onRequireAuth?: () => boolean
}

function lineToPrefill(line: PostLine): LyricBackPanelPrefill {
  return {
    lyric: line.text,
    songTitle: line.songTitle || '',
    artistName: line.artistName || '',
    songId: line.songId ?? null,
    audioUrl: line.audioUrl ?? null,
    externalListenUrl: null,
    artwork: line.artworkUrl ?? null,
    startSec: line.snippetStart ?? null,
    endSec: line.snippetEnd ?? null,
  }
}

export function PostMomentInlineEdit({
  post,
  onCancel,
  onSaved,
  onRequireAuth,
}: PostMomentInlineEditProps) {
  const composeRef = useRef<LyricBackPanelComposeHandle>(null)
  const lines = resolveMomentLines(post)
  const primary = lines[0] ?? {
    position: 0,
    text: post.text || '',
    songId: post.songId ?? null,
    songTitle: post.knowledge?.song ?? null,
    artistName: post.knowledge?.artist ?? null,
    artworkUrl: post.knowledge?.artwork ?? null,
    audioUrl: post.audioUrl ?? null,
    snippetStart: post.snippetStart ?? null,
    snippetEnd: post.snippetEnd ?? null,
    source: post.songId ? 'catalog' : 'external',
  }

  const [vibeLabel, setVibeLabel] = useState(
    () => emotionToVibeLabel(post.emotion || 'chill') ?? 'Chill',
  )
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    setVibeLabel(emotionToVibeLabel(post.emotion || 'chill') ?? 'Chill')
  }, [post.id, post.emotion])

  const submitEmotion = vibeLabelToEmotion(vibeLabel) ?? (post.emotion || 'chill')

  return (
    <div className="margo-post-moment-edit" data-no-card-nav>
      <div className="margo-post-moment-edit__head">
        <span className="margo-post-moment-edit__title">Edit</span>
        <button type="button" className="margo-post-moment-edit__cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
      <LyricBackPanelCompose
        ref={composeRef}
        key={post.id}
        layout="panel"
        mode="edit"
        editTarget="moment"
        editPostId={post.id}
        momentSourceLines={lines.length > 0 ? lines : [primary]}
        parentPostId={`moment-edit-${post.id}`}
        parentEmotion={submitEmotion}
        submitEmotion={submitEmotion}
        prefill={lineToPrefill(primary)}
        onRequireAuth={onRequireAuth}
        focusSearchOnMount={false}
        onPostingChange={setPosting}
        panelAfterBody={
          <>
            <MomentComposeVibePicker vibeLabel={vibeLabel} onVibeSelect={setVibeLabel} />
            <button
              type="button"
              className="margo-post-moment-edit__save"
              disabled={posting}
              onClick={() => composeRef.current?.save()}
            >
              {posting ? 'Saving…' : 'Save'}
            </button>
          </>
        }
        onSaved={(payload) => {
          const nextLines = (lines.length > 0 ? lines : [primary]).map((line, idx) =>
            idx === 0
              ? {
                  ...line,
                  text: payload.text,
                  songId: payload.songId,
                  songTitle: payload.songTitle,
                  artistName: payload.artistName,
                  artworkUrl: payload.artworkUrl,
                  snippetStart: payload.snippetStartSec,
                  snippetEnd: payload.snippetEndSec,
                  audioUrl: payload.audioUrl,
                  source: payload.songId ? ('catalog' as const) : ('external' as const),
                }
              : line,
          )
          onSaved({
            ...post,
            text: payload.text,
            emotion: payload.emotion,
            songId: payload.songId,
            snippetStart: payload.snippetStartSec,
            snippetEnd: payload.snippetEndSec,
            audioUrl: payload.audioUrl,
            knowledge: {
              song: payload.songTitle,
              artist: payload.artistName,
              artwork: payload.artworkUrl,
            },
            lines: nextLines,
          })
        }}
      />
    </div>
  )
}
