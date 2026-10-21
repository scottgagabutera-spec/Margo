'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { playSnippet, togglePlayPause } from '@/lib/audio-engine'
import { useAudioEngine } from '@/hooks/useAudioEngine'
import { useEchoes, type Echo } from '@/hooks/useEchoes'
import { LyricBackThreadRow } from '@/components/lyric-back-thread-row'
import {
  FeedIconClose,
  FeedIconChevronRight,
  FeedIconSend,
  FeedMomentPlaybackIcon,
} from '@/components/feed-card-icons'
import type { SuggestedLyricBack } from '@/lib/suggest-lyric-back'
import { fetchLyricBackSuggestionsForPost } from '@/lib/lyric-back-suggestions'
import { trackEvent } from '@/lib/analytics/track'

export type { SuggestedLyricBack }

type ComposeDraft = {
  lyric: string
  songTitle: string
  artistName: string
  songId: string | null
  startSec: number | null
  endSec: number | null
}

export type PostCardSuggestedReplyProps = {
  /** Root feed moment id (thread root). */
  postId: string
  echoCount: number
  parentUsername?: string | null
  parentEmotion: string
  parentMoment?: {
    text?: string
    song?: string | null
    artist?: string | null
  }
  open: boolean
  onClose: () => void
  onRequireAuth?: () => boolean
  onFindLineForTarget?: (targetPostId: string, rootPostId: string) => void
  onOpenThread?: (echoId: string) => void
  onExportEcho?: (echo: Echo) => void
  onReplayEcho?: (echoId: string) => void
}

function LyricBackPanelSkeleton() {
  return (
    <div className="margo-post-card__lb-skeleton" aria-hidden>
      {[0, 1].map((i) => (
        <div key={i} className="margo-post-card__lb-skeleton-row">
          <div className="margo-post-card__lb-skeleton-line margo-post-card__lb-skeleton-line--wide" />
          <div className="margo-post-card__lb-skeleton-line margo-post-card__lb-skeleton-line--narrow" />
        </div>
      ))}
    </div>
  )
}

function IdeasSkeleton() {
  return (
    <div className="margo-post-card__lb-skeleton margo-post-card__lb-skeleton--compact" aria-hidden>
      <div className="margo-post-card__lb-skeleton-row">
        <div className="margo-post-card__lb-skeleton-line margo-post-card__lb-skeleton-line--wide" />
        <div className="margo-post-card__lb-skeleton-line margo-post-card__lb-skeleton-line--narrow" />
      </div>
    </div>
  )
}

/**
 * Lyric Back comment sheet: echoes first, opt-in ideas, inline compose + send.
 */
export function PostCardSuggestedReply({
  postId,
  echoCount,
  parentUsername,
  parentEmotion,
  parentMoment,
  open,
  onClose,
  onRequireAuth,
  onFindLineForTarget,
  onOpenThread,
  onExportEcho,
  onReplayEcho,
}: PostCardSuggestedReplyProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [replyTargetId, setReplyTargetId] = useState(postId)
  const [replyTargetLabel, setReplyTargetLabel] = useState<string | null>(null)
  const { echoes, loading: echoesLoading, refetch: refetchEchoes } = useEchoes(open ? replyTargetId : null)

  const [ideasOpen, setIdeasOpen] = useState(false)
  const [ideasLoading, setIdeasLoading] = useState(false)
  const [ideasError, setIdeasError] = useState<string | null>(null)
  const [picks, setPicks] = useState<SuggestedLyricBack[] | null>(null)
  const [ideasFetched, setIdeasFetched] = useState(false)

  const [draftLyric, setDraftLyric] = useState('')
  const [draft, setDraft] = useState<ComposeDraft | null>(null)
  const [posting, setPosting] = useState(false)
  const [composeError, setComposeError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setIdeasOpen(false)
      setIdeasLoading(false)
      setIdeasError(null)
      setPicks(null)
      setIdeasFetched(false)
      setDraftLyric('')
      setDraft(null)
      setPosting(false)
      setComposeError(null)
      setReplyTargetId(postId)
      setReplyTargetLabel(null)
    }
  }, [open, postId])

  useEffect(() => {
    if (open) {
      setReplyTargetId(postId)
      setReplyTargetLabel(null)
    }
  }, [open, postId])

  const loadIdeas = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIdeasError('Offline. Search Margo music when you are back online.')
      setIdeasFetched(true)
      setIdeasLoading(false)
      return
    }
    setIdeasLoading(true)
    setIdeasError(null)
    try {
      const list = await fetchLyricBackSuggestionsForPost(postId)
      setPicks(list)
      setIdeasFetched(true)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not load ideas'
      setIdeasError(message)
      setPicks(null)
      setIdeasFetched(false)
    } finally {
      setIdeasLoading(false)
    }
  }, [postId])

  useEffect(() => {
    if (!ideasOpen || ideasFetched || ideasLoading) return
    void loadIdeas()
  }, [ideasOpen, ideasFetched, ideasLoading, loadIdeas])

  const applySuggestion = useCallback((s: SuggestedLyricBack) => {
    setDraftLyric(s.text)
    setDraft({
      lyric: s.text,
      songTitle: s.songTitle,
      artistName: s.artistName,
      songId: s.songId,
      startSec: s.startSec,
      endSec: s.endSec,
    })
    setComposeError(null)
  }, [])

  const canSend = Boolean(
    draftLyric.trim()
    && draft?.songTitle
    && draft?.artistName
    && !posting,
  )

  const handleSend = useCallback(async () => {
    if (onRequireAuth && !onRequireAuth()) return
    if (!canSend || !draft) return
    setPosting(true)
    setComposeError(null)
    try {
      const res = await fetch('/api/posts/lyric-back', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentPostId: replyTargetId,
          isPrivate: false,
          text: draftLyric.trim(),
          emotion: parentEmotion,
          songId: draft.songId,
          songTitle: draft.songTitle,
          artistName: draft.artistName,
          snippetStartSec: draft.startSec,
          snippetEndSec: draft.endSec,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setComposeError(typeof payload.error === 'string' ? payload.error : 'Could not send.')
        return
      }
      trackEvent('lyric_back_sent', { private: false, inline: true })
      const replyId = typeof payload.id === 'string' ? payload.id : null
      if (replyId) {
        fetch('/api/moderate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: draftLyric.trim(), postId: replyId }),
        }).catch(() => {})
      }
      setDraftLyric('')
      setDraft(null)
      void refetchEchoes()
    } catch {
      setComposeError('Could not send. Try again.')
    } finally {
      setPosting(false)
    }
  }, [canSend, draft, draftLyric, onRequireAuth, parentEmotion, replyTargetId, refetchEchoes])

  const focusNestedLyricBack = useCallback((echo: Echo) => {
    setReplyTargetId(echo.id)
    const handle = echo.username ? `@${echo.username.replace(/^@/, '')}` : 'this Lyric Back'
    setReplyTargetLabel(handle)
    setDraft(null)
    setDraftLyric('')
  }, [])

  if (!open) return null

  const displayCount = Math.max(echoCount, echoes.length)
  const showEchoEmpty = !echoesLoading && echoes.length === 0
  const showIdeasEmpty = ideasFetched && !ideasLoading && !ideasError && (picks?.length ?? 0) === 0

  return (
    <div
      ref={panelRef}
      data-no-card-nav
      className="margo-post-card__lb-panel"
      role="region"
      aria-label="Lyric Backs"
    >
      <div className="margo-post-card__lb-header">
        <h3 className="margo-post-card__lb-title">Lyric Backs · {displayCount}</h3>
        <button
          type="button"
          className="margo-post-card__lb-close"
          aria-label="Close Lyric Backs"
          onClick={onClose}
        >
          <FeedIconClose size={20} />
        </button>
      </div>

      <div className="margo-post-card__lb-scroll">
        <div className="margo-post-card__lb-context">
          <p className="margo-post-card__lb-context-label">Original moment</p>
          <p className="margo-post-card__lb-context-lyric">
            {parentMoment?.text ? `“${parentMoment.text}”` : 'This post'}
          </p>
          {(parentMoment?.song || parentMoment?.artist) ? (
            <p className="margo-post-card__lb-context-track">
              {parentMoment.song}{parentMoment.artist ? ` · ${parentMoment.artist}` : ''}
            </p>
          ) : null}
          {parentUsername ? (
            <p className="margo-post-card__lb-context-user">@{parentUsername.replace(/^@/, '')}</p>
          ) : null}
        </div>

        {replyTargetId !== postId ? (
          <div className="margo-post-card__lb-focus">
            <button
              type="button"
              className="margo-post-card__lb-focus-back"
              onClick={() => {
                setReplyTargetId(postId)
                setReplyTargetLabel(null)
              }}
            >
              ← All Lyric Backs on this moment
            </button>
            <p className="margo-post-card__lb-focus-label">
              Replying to {replyTargetLabel ?? 'this Lyric Back'}
            </p>
          </div>
        ) : null}

        {echoesLoading ? <LyricBackPanelSkeleton /> : null}

        {showEchoEmpty ? (
          <p className="margo-post-card__lb-empty-title margo-post-card__lb-empty-title--solo">
            No Lyric Backs yet
          </p>
        ) : null}

        {!echoesLoading && echoes.length > 0 ? (
          <ul className="margo-post-card__lb-list margo-post-card__lb-list--echoes">
            {echoes.map((echo) => (
              <li key={echo.id}>
                <LyricBackThreadRow
                  echo={echo}
                  tone="reply"
                  onLyricBack={(echoId) => {
                    if (onFindLineForTarget) {
                      onFindLineForTarget(echoId, postId)
                      return
                    }
                    focusNestedLyricBack(echo)
                  }}
                  onOpenThread={(id) => onOpenThread?.(id)}
                  onExport={onExportEcho}
                  onReplay={onReplayEcho}
                />
              </li>
            ))}
          </ul>
        ) : null}

        <div className="margo-post-card__lb-ideas-section">
          <button
            type="button"
            className="margo-post-card__lb-ideas-toggle"
            aria-expanded={ideasOpen}
            onClick={() => setIdeasOpen((o) => !o)}
          >
            <span>See ideas from Margo music</span>
            <span
              className="margo-post-card__lb-ideas-chevron"
              style={{ transform: ideasOpen ? 'rotate(90deg)' : 'none' }}
            >
              <FeedIconChevronRight size={16} />
            </span>
          </button>

          {ideasOpen ? (
            <div className="margo-post-card__lb-ideas-body">
              {ideasLoading ? <IdeasSkeleton /> : null}
              {ideasError && !ideasLoading ? (
                <div className="margo-post-card__lb-status-block">
                  <p className="margo-post-card__lb-status-title">Could not load ideas</p>
                  <p className="margo-post-card__lb-status">{ideasError}</p>
                  <button
                    type="button"
                    className="margo-post-card__lb-footer-btn margo-post-card__lb-footer-btn--full"
                    onClick={() => void loadIdeas()}
                  >
                    Retry
                  </button>
                </div>
              ) : null}
              {showIdeasEmpty ? (
                <p className="margo-post-card__lb-status">No ideas for this moment.</p>
              ) : null}
              {!ideasLoading && !ideasError && (picks?.length ?? 0) > 0 && picks ? (
                <ul className="margo-post-card__lb-list">
                  {picks.map((s) => (
                    <li key={`${s.songId}_${s.lineIndex}_${s.startSec}`}>
                      <SuggestionRow suggestion={s} onAccept={() => applySuggestion(s)} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="margo-post-card__lb-compose">
        {!draft?.songTitle ? (
          onFindLineForTarget ? (
            <button
              type="button"
              className="margo-post-card__lb-compose-find"
              onClick={() => onFindLineForTarget(replyTargetId, postId)}
            >
              Find your Lyric Back
            </button>
          ) : null
        ) : (
          <>
            <p className="margo-post-card__lb-compose-heading">Your Lyric Back</p>
            <p className="margo-post-card__lb-compose-track">
              <span className="margo-post-card__lb-compose-song">{draft.songTitle}</span>
              {draft.artistName ? (
                <span className="margo-post-card__lb-compose-artist">{draft.artistName}</span>
              ) : null}
            </p>
            <p className="margo-post-card__lb-compose-lyric-preview">&ldquo;{draftLyric.trim() || draft.lyric}&rdquo;</p>
            {composeError ? (
              <p className="margo-post-card__lb-compose-error" role="alert">{composeError}</p>
            ) : null}
            <div className="margo-post-card__lb-compose-bar">
              {onFindLineForTarget ? (
                <button
                  type="button"
                  className="margo-post-card__lb-compose-change"
                  onClick={() => onFindLineForTarget(replyTargetId, postId)}
                >
                  Change song
                </button>
              ) : null}
              <button
                type="button"
                className="margo-post-card__lb-compose-send"
                aria-label="Send Lyric Back"
                disabled={!canSend}
                onClick={() => void handleSend()}
              >
                <span className="margo-post-card__lb-compose-send-label">Send</span>
                <FeedIconSend size={18} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function SuggestionRow({
  suggestion,
  onAccept,
}: {
  suggestion: SuggestedLyricBack
  onAccept: () => void
}) {
  const engine = useAudioEngine()
  const canPlay = Boolean(suggestion.audioUrl)
  const isPlaying =
    canPlay
    && engine.playing
    && engine.mode === 'snippet'
    && engine.songId === suggestion.songId
    && engine.snippet?.lineIndex === suggestion.lineIndex
  const isBuffering = isPlaying && engine.buffering

  return (
    <div className="margo-post-card__lb-row">
      <button type="button" onClick={onAccept} className="margo-post-card__lb-row-body">
        <p className="margo-post-card__lb-row-lyric">&ldquo;{suggestion.text}&rdquo;</p>
        <p className="margo-post-card__lb-row-meta">
          <span className="margo-post-card__lb-echo-song">{suggestion.songTitle}</span>
          <span className="margo-post-card__lb-echo-artist">{suggestion.artistName}</span>
        </p>
      </button>
      {canPlay ? (
        <button
          type="button"
          aria-label={isPlaying ? 'Pause suggestion' : 'Play suggestion'}
          className="margo-post-card__lb-row-play"
          onClick={(e) => {
            e.stopPropagation()
            if (isPlaying) {
              togglePlayPause()
              return
            }
            if (!suggestion.audioUrl) return
            void playSnippet({
              songId: suggestion.songId,
              audioUrl: suggestion.audioUrl,
              title: suggestion.songTitle,
              artist: suggestion.artistName,
              artwork: suggestion.artworkUrl ?? null,
              lineIndex: suggestion.lineIndex,
              lineText: suggestion.text,
              startSec: suggestion.startSec,
              endSec: suggestion.endSec,
              vibe: suggestion.vibe,
              source: 'feed',
            })
          }}
        >
          <span className="margo-post-card__lb-row-play-inner">
            <FeedMomentPlaybackIcon playing={isPlaying} buffering={isBuffering} size={16} color="var(--post-vibe-fill)" />
          </span>
        </button>
      ) : null}
    </div>
  )
}
